import pino from 'pino';
import { describe, expect, it } from 'vitest';
import type { SandboxConfig } from '../../src/config/config';
import type {
  CommandOptions,
  CommandResult,
  CommandRunner,
} from '../../src/infrastructure/process/command-runner';
import { DockerSandbox, SandboxError } from '../../src/infrastructure/sandbox/docker-sandbox';

interface RecordedCall {
  args: readonly string[];
  options: CommandOptions | undefined;
}

type Responder = (args: readonly string[]) => Partial<CommandResult> | undefined;

class ScriptedCommandRunner implements CommandRunner {
  readonly calls: RecordedCall[] = [];

  constructor(private readonly responder: Responder = () => undefined) {}

  async run(command: string, args: readonly string[], options?: CommandOptions): Promise<CommandResult> {
    expect(command).toBe('docker');
    this.calls.push({ args, options });

    return {
      exitCode: 0,
      signal: null,
      stdout: '',
      stderr: '',
      timedOut: false,
      outputLimitExceeded: false,
      durationMs: 10,
      ...this.responder(args),
    };
  }

  find(predicate: (args: readonly string[]) => boolean): RecordedCall | undefined {
    return this.calls.find((call) => predicate(call.args));
  }
}

const config: SandboxConfig = {
  image: 'online-compiler-sandbox:gcc14',
  runtime: undefined,
  maxConcurrency: 1,
  maxQueue: 0,
  compileTimeoutMs: 10000,
  runTimeoutMs: 3000,
  memoryMb: 256,
  cpus: 0.5,
  pidsLimit: 32,
  maxOutputBytes: 1024,
};

const logger = pino({ level: 'silent' });
const request = { source: 'int main() {}', stdin: '1 2', standard: 'c++20' as const };

const isCompile = (args: readonly string[]) => args.includes('g++');
const isRun = (args: readonly string[]) => args.includes('/sandbox/main');
const isReportRead = (args: readonly string[]) => args.includes('/tmp/oc-report.json') && args.includes('cat');
const isOomCheck = (args: readonly string[]) => args.includes('/sys/fs/cgroup/memory.events');

const report = (overrides: Record<string, unknown> = {}) => ({
  stdout: JSON.stringify({
    timedOut: false,
    exitCode: 0,
    signal: 0,
    wallMs: 42,
    cpuMs: 40,
    maxRssKb: 3300,
    ...overrides,
  }),
});

function createSandbox(responder?: Responder, overrides: Partial<SandboxConfig> = {}) {
  const commands = new ScriptedCommandRunner(responder);
  return { commands, sandbox: new DockerSandbox(commands, { ...config, ...overrides }, logger) };
}

describe('DockerSandbox', () => {
  it('starts an isolated container with resource limits', async () => {
    const { commands, sandbox } = createSandbox();

    await sandbox.run(request);

    const start = commands.find((args) => args[0] === 'run');
    expect(start?.args).toEqual(
      expect.arrayContaining([
        '--network',
        'none',
        '--read-only',
        '--cap-drop',
        'ALL',
        '--security-opt',
        'no-new-privileges',
        '--user',
        '65534:65534',
        '--memory',
        '256m',
        '--memory-swap',
        '256m',
        '--cpus',
        '0.5',
        '--pids-limit',
        '32',
      ]),
    );
    expect(start?.args).not.toContain('--runtime');
  });

  it('uses the configured container runtime', async () => {
    const { commands, sandbox } = createSandbox(undefined, { runtime: 'runsc' });

    await sandbox.run(request);

    const start = commands.find((args) => args[0] === 'run');
    expect(start?.args).toEqual(expect.arrayContaining(['--runtime', 'runsc']));
  });

  it('passes source and stdin through stdin rather than the command line', async () => {
    const { commands, sandbox } = createSandbox();

    await sandbox.run(request);

    const write = commands.find((args) => args.includes('sh'));
    expect(write?.options?.stdin).toBe(request.source);
    expect(commands.find(isRun)?.options?.stdin).toBe(request.stdin);
    expect(commands.calls.flatMap((call) => call.args)).not.toContain(request.source);
    expect(commands.find(isCompile)?.args).toContain('-std=c++20');
  });

  it('runs the program through the metering runner with the run time limit', async () => {
    const { commands, sandbox } = createSandbox();

    await sandbox.run(request);

    expect(commands.find(isRun)?.args.slice(-4)).toEqual([
      'oc-runner',
      '3000',
      '/tmp/oc-report.json',
      '/sandbox/main',
    ]);
  });

  it('returns program output and metrics on success and removes the container', async () => {
    const { commands, sandbox } = createSandbox((args) => {
      if (isCompile(args)) {
        return { durationMs: 812 };
      }
      if (isRun(args)) {
        return { stdout: '3\n' };
      }
      return isReportRead(args) ? report() : undefined;
    });

    const result = await sandbox.run(request);

    expect(result).toEqual({
      status: 'success',
      compileOutput: '',
      stdout: '3\n',
      stderr: '',
      exitCode: 0,
      metrics: { compileMs: 812, wallMs: 42, cpuMs: 40, memoryKb: 3300 },
    });
    expect(commands.calls.at(-1)?.args.slice(0, 2)).toEqual(['rm', '--force']);
  });

  it('reports compilation errors without running the program', async () => {
    const { commands, sandbox } = createSandbox((args) =>
      isCompile(args) ? { exitCode: 1, stderr: "main.cpp:1: error: 'x' was not declared" } : undefined,
    );

    const result = await sandbox.run(request);

    expect(result.status).toBe('compilation_error');
    expect(result.compileOutput).toContain("'x' was not declared");
    expect(result.metrics).toEqual({ compileMs: 10, wallMs: null, cpuMs: null, memoryKb: null });
    expect(commands.find(isRun)).toBeUndefined();
  });

  it('reports compilation timeouts', async () => {
    const { sandbox } = createSandbox((args) => (isCompile(args) ? { exitCode: 137 } : undefined));

    const result = await sandbox.run(request);

    expect(result.status).toBe('compilation_error');
    expect(result.compileOutput).toMatch(/exceeded the time or memory limit/);
  });

  it.each([
    ['runtime_error', { exitCode: 1 }, { exitCode: 1 }, 'oom_kill 0'],
    ['runtime_error', { exitCode: 139 }, undefined, 'oom_kill 0'],
    ['output_limit_exceeded', { exitCode: null, outputLimitExceeded: true }, undefined, ''],
    ['time_limit_exceeded', { exitCode: null, timedOut: true }, undefined, ''],
    ['time_limit_exceeded', { exitCode: 137 }, { timedOut: true, exitCode: 137, signal: 9 }, 'oom_kill 0'],
    ['memory_limit_exceeded', { exitCode: 137 }, { exitCode: 137, signal: 9 }, 'oom_kill 1'],
    ['runtime_error', { exitCode: 137 }, { exitCode: 137, signal: 9 }, 'oom_kill 0'],
    ['memory_limit_exceeded', { exitCode: 137 }, { timedOut: true, exitCode: 137, signal: 9, maxRssKb: 255 * 1024 }, ''],
    ['memory_limit_exceeded', { exitCode: 134 }, { exitCode: 134, signal: 6, maxRssKb: 250 * 1024 }, ''],
    ['time_limit_exceeded', { exitCode: 137 }, { timedOut: true, exitCode: 137, signal: 9, maxRssKb: 200 * 1024 }, ''],
  ] as const)('classifies %s', async (status, runResult, runReport, oomCounters) => {
    const { sandbox } = createSandbox((args) => {
      if (isRun(args)) {
        return runResult;
      }
      if (isReportRead(args)) {
        return runReport ? report(runReport) : { exitCode: 1 };
      }
      if (isOomCheck(args)) {
        return { stdout: `oom 0\n${oomCounters}\n` };
      }
      return undefined;
    });

    const result = await sandbox.run(request);

    expect(result.status).toBe(status);
  });

  it('ignores malformed run reports', async () => {
    const { sandbox } = createSandbox((args) => (isReportRead(args) ? { stdout: 'garbage' } : undefined));

    const result = await sandbox.run(request);

    expect(result.status).toBe('success');
    expect(result.metrics.wallMs).toBeNull();
  });

  it('throws and still cleans up when the container cannot start', async () => {
    const { commands, sandbox } = createSandbox((args) =>
      args[0] === 'run' ? { exitCode: 125, stderr: 'no such image' } : undefined,
    );

    await expect(sandbox.run(request)).rejects.toBeInstanceOf(SandboxError);
    expect(commands.calls.at(-1)?.args[0]).toBe('rm');
  });

  it('pulls the image and removes orphaned containers during preparation', async () => {
    const { commands, sandbox } = createSandbox((args) => {
      if (args[0] === 'ps') {
        return { stdout: 'abc\ndef\n' };
      }
      if (args[0] === 'image') {
        return { exitCode: 1 };
      }
      return undefined;
    });

    await sandbox.prepare();

    expect(commands.find((args) => args[0] === 'rm')?.args).toEqual(['rm', '--force', 'abc', 'def']);
    expect(commands.find((args) => args[0] === 'pull')?.args).toEqual(['pull', 'online-compiler-sandbox:gcc14']);
  });
});
