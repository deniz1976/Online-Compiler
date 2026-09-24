import { spawn } from 'node:child_process';

export interface CommandOptions {
  stdin?: string;
  timeoutMs?: number;
  maxOutputBytes?: number;
}

export interface CommandResult {
  exitCode: number | null;
  signal: NodeJS.Signals | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
  outputLimitExceeded: boolean;
  durationMs: number;
}

export interface CommandRunner {
  run(command: string, args: readonly string[], options?: CommandOptions): Promise<CommandResult>;
}

class BoundedBuffer {
  private readonly chunks: Buffer[] = [];
  private size = 0;

  constructor(private readonly limit: number) {}

  append(chunk: Buffer): boolean {
    const remaining = this.limit - this.size;

    if (chunk.length <= remaining) {
      this.chunks.push(chunk);
      this.size += chunk.length;
      return true;
    }

    if (remaining > 0) {
      this.chunks.push(chunk.subarray(0, remaining));
      this.size += remaining;
    }

    return false;
  }

  toString(): string {
    return Buffer.concat(this.chunks).toString('utf8');
  }
}

export class SpawnCommandRunner implements CommandRunner {
  run(command: string, args: readonly string[], options: CommandOptions = {}): Promise<CommandResult> {
    return new Promise((resolve, reject) => {
      const startedAt = performance.now();
      const child = spawn(command, args, { stdio: ['pipe', 'pipe', 'pipe'] });
      const stdout = new BoundedBuffer(options.maxOutputBytes ?? Number.POSITIVE_INFINITY);
      const stderr = new BoundedBuffer(options.maxOutputBytes ?? Number.POSITIVE_INFINITY);
      let timedOut = false;
      let outputLimitExceeded = false;
      let settled = false;

      const kill = () => {
        if (child.exitCode === null && child.signalCode === null) {
          child.kill('SIGKILL');
        }
      };

      const timer =
        options.timeoutMs === undefined
          ? undefined
          : setTimeout(() => {
              timedOut = true;
              kill();
            }, options.timeoutMs);

      const collect = (buffer: BoundedBuffer) => (chunk: Buffer) => {
        if (!buffer.append(chunk)) {
          outputLimitExceeded = true;
          kill();
        }
      };

      child.stdout.on('data', collect(stdout));
      child.stderr.on('data', collect(stderr));
      child.stdin.on('error', () => undefined);
      child.stdin.end(options.stdin ?? '');

      child.once('error', (error) => {
        clearTimeout(timer);
        if (!settled) {
          settled = true;
          reject(error);
        }
      });

      child.once('close', (exitCode, signal) => {
        clearTimeout(timer);
        if (settled) {
          return;
        }
        settled = true;
        resolve({
          exitCode,
          signal,
          stdout: stdout.toString(),
          stderr: stderr.toString(),
          timedOut,
          outputLimitExceeded,
          durationMs: Math.round(performance.now() - startedAt),
        });
      });
    });
  }
}
