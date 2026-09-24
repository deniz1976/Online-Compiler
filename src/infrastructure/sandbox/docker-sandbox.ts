import { randomUUID } from 'node:crypto';
import type { Logger } from 'pino';
import { z } from 'zod';
import type { SandboxConfig } from '../../config/config';
import type { CppStandard } from '../../domain/cpp';
import {
  EMPTY_METRICS,
  type CodeRunner,
  type ExecutionRequest,
  type ExecutionResult,
  type ExecutionStatus,
} from '../../domain/execution';
import type { CommandResult, CommandRunner } from '../process/command-runner';

const DOCKER = 'docker';
const CONTAINER_PREFIX = 'oc-sandbox-';
const SANDBOX_LABEL = 'online-compiler.sandbox';
const WORKDIR = '/sandbox';
const SOURCE_FILE = 'main.cpp';
const BINARY_FILE = 'main';
const RUNNER = 'oc-runner';
const REPORT_PATH = '/tmp/oc-report.json';
const SANDBOX_USER = '65534:65534';
const KILLED_EXIT_CODE = 137;
const SIGKILL = 9;
const HOST_TIMEOUT_GRACE_MS = 2000;
const CONTAINER_LIFETIME_GRACE_SECONDS = 60;
const DOCKER_COMMAND_TIMEOUT_MS = 30_000;
const IMAGE_PULL_TIMEOUT_MS = 10 * 60_000;
const OOM_COUNTER_FILES = ['/sys/fs/cgroup/memory.events', '/sys/fs/cgroup/memory/memory.oom_control'];
const OOM_KILL_PATTERN = /^oom_kill\s+(\d+)$/m;

const runReportSchema = z.object({
  timedOut: z.boolean(),
  exitCode: z.number().int(),
  signal: z.number().int(),
  wallMs: z.number().nonnegative(),
  cpuMs: z.number().nonnegative(),
  maxRssKb: z.number().nonnegative(),
});

type RunReport = z.infer<typeof runReportSchema>;

export class SandboxError extends Error {
  constructor(message: string, readonly result?: CommandResult) {
    super(message);
    this.name = 'SandboxError';
  }
}

export class DockerSandbox implements CodeRunner {
  constructor(
    private readonly commands: CommandRunner,
    private readonly config: SandboxConfig,
    private readonly logger: Logger,
  ) {}

  async prepare(): Promise<void> {
    await this.removeOrphanedContainers();
    await this.ensureImage();
  }

  async run(request: ExecutionRequest): Promise<ExecutionResult> {
    const container = `${CONTAINER_PREFIX}${randomUUID()}`;

    try {
      await this.startContainer(container);
      await this.writeSource(container, request.source);

      const compilation = await this.compile(container, request.standard);
      const compileOutput = compilation.stderr + compilation.stdout;
      const compileMs = compilation.durationMs;

      if (compilation.exitCode !== 0) {
        return {
          status: 'compilation_error',
          compileOutput: this.describeCompilationFailure(compilation, compileOutput),
          stdout: '',
          stderr: '',
          exitCode: compilation.exitCode,
          metrics: { ...EMPTY_METRICS, compileMs },
        };
      }

      const execution = await this.execute(container, request.stdin);
      const report = await this.readReport(container, execution);

      return {
        status: await this.classify(container, execution, report),
        compileOutput,
        stdout: execution.stdout,
        stderr: execution.stderr,
        exitCode: report?.exitCode ?? execution.exitCode,
        metrics: {
          compileMs,
          wallMs: report?.wallMs ?? null,
          cpuMs: report?.cpuMs ?? null,
          memoryKb: report?.maxRssKb ?? null,
        },
      };
    } finally {
      await this.removeContainers([container]);
    }
  }

  private async startContainer(container: string): Promise<void> {
    const { memoryMb, cpus, pidsLimit, runtime, image, compileTimeoutMs, runTimeoutMs } = this.config;
    const lifetimeSeconds =
      Math.ceil((compileTimeoutMs + runTimeoutMs) / 1000) + CONTAINER_LIFETIME_GRACE_SECONDS;

    const result = await this.docker(
      [
        'run',
        '--detach',
        '--rm',
        '--name',
        container,
        '--label',
        `${SANDBOX_LABEL}=true`,
        '--network',
        'none',
        '--read-only',
        '--tmpfs',
        `${WORKDIR}:rw,exec,nosuid,nodev,size=64m,mode=1777`,
        '--tmpfs',
        '/tmp:rw,nosuid,nodev,size=64m,mode=1777',
        '--workdir',
        WORKDIR,
        '--user',
        SANDBOX_USER,
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--memory',
        `${memoryMb}m`,
        '--memory-swap',
        `${memoryMb}m`,
        '--cpus',
        String(cpus),
        '--pids-limit',
        String(pidsLimit),
        '--ulimit',
        'nofile=256:256',
        '--ulimit',
        'core=0',
        ...(runtime ? ['--runtime', runtime] : []),
        image,
        'sleep',
        String(lifetimeSeconds),
      ],
      { timeoutMs: DOCKER_COMMAND_TIMEOUT_MS },
    );

    this.assertSucceeded(result, 'Failed to start sandbox container');
  }

  private async writeSource(container: string, source: string): Promise<void> {
    const result = await this.docker(
      ['exec', '--interactive', container, 'sh', '-c', `cat > ${WORKDIR}/${SOURCE_FILE}`],
      { stdin: source, timeoutMs: DOCKER_COMMAND_TIMEOUT_MS },
    );

    this.assertSucceeded(result, 'Failed to write source into sandbox');
  }

  private compile(container: string, standard: CppStandard): Promise<CommandResult> {
    const { compileTimeoutMs, maxOutputBytes } = this.config;

    return this.docker(
      [
        'exec',
        container,
        'timeout',
        '--signal=KILL',
        toSeconds(compileTimeoutMs),
        'g++',
        `-std=${standard}`,
        '-O2',
        '-pipe',
        '-Wall',
        '-Wextra',
        '-fmax-errors=50',
        '-fdiagnostics-color=never',
        '-o',
        BINARY_FILE,
        SOURCE_FILE,
      ],
      { timeoutMs: compileTimeoutMs + HOST_TIMEOUT_GRACE_MS, maxOutputBytes },
    );
  }

  private execute(container: string, stdin: string): Promise<CommandResult> {
    const { runTimeoutMs, maxOutputBytes } = this.config;

    return this.docker(
      [
        'exec',
        '--interactive',
        container,
        RUNNER,
        String(runTimeoutMs),
        REPORT_PATH,
        `${WORKDIR}/${BINARY_FILE}`,
      ],
      { stdin, timeoutMs: runTimeoutMs + HOST_TIMEOUT_GRACE_MS, maxOutputBytes },
    );
  }

  private async readReport(container: string, execution: CommandResult): Promise<RunReport | null> {
    if (execution.timedOut || execution.outputLimitExceeded) {
      return null;
    }

    const result = await this.docker(['exec', container, 'cat', REPORT_PATH], {
      timeoutMs: DOCKER_COMMAND_TIMEOUT_MS,
    });

    if (result.exitCode !== 0) {
      return null;
    }

    try {
      return runReportSchema.parse(JSON.parse(result.stdout));
    } catch {
      this.logger.warn({ container }, 'Sandbox produced an unreadable run report');
      return null;
    }
  }

  private async classify(
    container: string,
    execution: CommandResult,
    report: RunReport | null,
  ): Promise<ExecutionStatus> {
    if (execution.outputLimitExceeded) {
      return 'output_limit_exceeded';
    }

    if (execution.timedOut || report?.timedOut) {
      return 'time_limit_exceeded';
    }

    if (execution.exitCode === 0) {
      return 'success';
    }

    const killed = report ? report.signal === SIGKILL : execution.exitCode === KILLED_EXIT_CODE;

    if (killed && (await this.wasOomKilled(container))) {
      return 'memory_limit_exceeded';
    }

    return 'runtime_error';
  }

  private async wasOomKilled(container: string): Promise<boolean> {
    const result = await this.docker(['exec', container, 'cat', ...OOM_COUNTER_FILES], {
      timeoutMs: DOCKER_COMMAND_TIMEOUT_MS,
    });
    const match = OOM_KILL_PATTERN.exec(result.stdout);

    return match !== null && Number(match[1]) > 0;
  }

  private describeCompilationFailure(result: CommandResult, output: string): string {
    if (result.timedOut || result.exitCode === KILLED_EXIT_CODE) {
      return `${output}Compilation was terminated because it exceeded the time or memory limit.`;
    }

    if (result.outputLimitExceeded) {
      return `${output}\n[compiler output truncated]`;
    }

    return output;
  }

  private async ensureImage(): Promise<void> {
    const { image } = this.config;
    const inspection = await this.docker(['image', 'inspect', image], {
      timeoutMs: DOCKER_COMMAND_TIMEOUT_MS,
    });

    if (inspection.exitCode === 0) {
      return;
    }

    this.logger.info({ image }, 'Pulling sandbox image');
    const pull = await this.docker(['pull', image], { timeoutMs: IMAGE_PULL_TIMEOUT_MS });
    this.assertSucceeded(
      pull,
      `Sandbox image ${image} is not available. Build it with "npm run sandbox:build" or point SANDBOX_IMAGE to a published image`,
    );
  }

  private async removeOrphanedContainers(): Promise<void> {
    const result = await this.docker(
      ['ps', '--all', '--quiet', '--filter', `label=${SANDBOX_LABEL}=true`],
      { timeoutMs: DOCKER_COMMAND_TIMEOUT_MS },
    );
    this.assertSucceeded(result, 'Failed to list sandbox containers');

    const ids = result.stdout.split('\n').filter((id) => id.trim().length > 0);

    if (ids.length > 0) {
      this.logger.warn({ count: ids.length }, 'Removing orphaned sandbox containers');
      await this.removeContainers(ids);
    }
  }

  private async removeContainers(containers: string[]): Promise<void> {
    try {
      await this.docker(['rm', '--force', ...containers], { timeoutMs: DOCKER_COMMAND_TIMEOUT_MS });
    } catch (error) {
      this.logger.error({ err: error, containers }, 'Failed to remove sandbox containers');
    }
  }

  private docker(
    args: string[],
    options: { stdin?: string; timeoutMs: number; maxOutputBytes?: number },
  ): Promise<CommandResult> {
    return this.commands.run(DOCKER, args, options);
  }

  private assertSucceeded(result: CommandResult, message: string): void {
    if (result.exitCode !== 0) {
      throw new SandboxError(`${message}: ${result.stderr.trim() || 'unknown error'}`, result);
    }
  }
}

function toSeconds(milliseconds: number): string {
  return (milliseconds / 1000).toString();
}
