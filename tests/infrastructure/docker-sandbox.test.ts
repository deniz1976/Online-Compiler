import pino from 'pino';
import { beforeAll, describe, expect, it } from 'vitest';
import { SpawnCommandRunner } from '../../src/infrastructure/process/command-runner';
import { DockerSandbox } from '../../src/infrastructure/sandbox/docker-sandbox';

const image = process.env.SANDBOX_TEST_IMAGE;

describe.skipIf(!image)('DockerSandbox with a real Docker daemon', () => {
  const sandbox = new DockerSandbox(
    new SpawnCommandRunner(),
    {
      image: image as string,
      runtime: process.env.SANDBOX_TEST_RUNTIME || undefined,
      maxConcurrency: 1,
      maxQueue: 0,
      compileTimeoutMs: 20000,
      runTimeoutMs: 2000,
      memoryMb: 256,
      cpus: 1,
      pidsLimit: 32,
      maxOutputBytes: 4096,
    },
    pino({ level: 'silent' }),
  );

  const run = (source: string, stdin = '') => sandbox.run({ source, stdin, standard: 'c++20' });

  beforeAll(async () => {
    await sandbox.prepare();
  }, 600_000);

  it('compiles and runs a program with stdin', async () => {
    const result = await run(
      '#include <iostream>\nint main() { int a, b; std::cin >> a >> b; std::cout << a + b; }',
      '2 40',
    );

    expect(result).toMatchObject({ status: 'success', stdout: '42', exitCode: 0 });
  });

  it('reports compilation errors', async () => {
    const result = await run('int main() { return missing; }');

    expect(result.status).toBe('compilation_error');
    expect(result.compileOutput).toContain('missing');
  });

  it('enforces the time limit', async () => {
    const result = await run('int main() { volatile int x = 0; while (true) { x = x + 1; } }');

    expect(result.status).toBe('time_limit_exceeded');
  });

  it('enforces the memory limit', async () => {
    const result = await run(
      '#include <vector>\n#include <iostream>\nint main() { std::vector<char> v(1u << 30, 1); std::cout << int(v[7]); }',
    );

    expect(result.status).toBe('memory_limit_exceeded');
  });

  it('enforces the output limit', async () => {
    const result = await run('#include <cstdio>\nint main() { for (;;) std::puts("spam"); }');

    expect(result.status).toBe('output_limit_exceeded');
    expect(result.stdout.length).toBeLessThanOrEqual(4096);
  });

  it('isolates the program from the network and filesystem', async () => {
    const result = await run(
      [
        '#include <fstream>',
        '#include <iostream>',
        '#include <unistd.h>',
        'int main() {',
        '  std::ifstream net("/proc/net/dev");',
        '  std::cout << net.rdbuf() << "\\nuid=" << getuid();',
        '  std::ofstream out("/etc/owned");',
        '  std::cout << "\\nwritable=" << out.is_open();',
        '}',
      ].join('\n'),
    );

    expect(result.status).toBe('success');
    expect(result.stdout).not.toMatch(/eth0/);
    expect(result.stdout).toContain('uid=65534');
    expect(result.stdout).toContain('writable=0');
  });
});
