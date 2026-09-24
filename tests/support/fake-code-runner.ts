import type { CodeRunner, ExecutionRequest, ExecutionResult } from '../../src/domain/execution';

export class FakeCodeRunner implements CodeRunner {
  readonly requests: ExecutionRequest[] = [];
  result: ExecutionResult = {
    status: 'success',
    compileOutput: '',
    stdout: 'hello\n',
    stderr: '',
    exitCode: 0,
    metrics: { compileMs: 400, wallMs: 5, cpuMs: 4, memoryKb: 3200 },
  };
  delayMs = 0;

  async run(request: ExecutionRequest): Promise<ExecutionResult> {
    this.requests.push(request);

    if (this.delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    }

    return this.result;
  }
}
