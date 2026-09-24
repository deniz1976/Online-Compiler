import { describe, expect, it } from 'vitest';
import { SpawnCommandRunner } from '../../src/infrastructure/process/command-runner';

const runner = new SpawnCommandRunner();
const node = process.execPath;

describe('SpawnCommandRunner', () => {
  it('passes stdin and captures output and exit code', async () => {
    const result = await runner.run(node, [
      '-e',
      'process.stdin.pipe(process.stdout); process.stderr.write("err"); process.exitCode = 3;',
    ], { stdin: 'hello' });

    expect(result).toMatchObject({
      exitCode: 3,
      stdout: 'hello',
      stderr: 'err',
      timedOut: false,
      outputLimitExceeded: false,
    });
  });

  it('kills the process when the timeout elapses', async () => {
    const result = await runner.run(node, ['-e', 'setTimeout(() => {}, 10000)'], { timeoutMs: 200 });

    expect(result.timedOut).toBe(true);
    expect(result.signal).toBe('SIGKILL');
  });

  it('truncates output and kills the process when the limit is exceeded', async () => {
    const result = await runner.run(
      node,
      ['-e', 'setInterval(() => process.stdout.write("x".repeat(1024)), 1)'],
      { maxOutputBytes: 4096, timeoutMs: 5000 },
    );

    expect(result.outputLimitExceeded).toBe(true);
    expect(result.timedOut).toBe(false);
    expect(result.stdout.length).toBe(4096);
  });

  it('rejects when the command cannot be started', async () => {
    await expect(runner.run('definitely-not-a-real-command', [])).rejects.toThrow(/ENOENT/);
  });
});
