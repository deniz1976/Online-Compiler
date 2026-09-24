import type { CodeRunner, ExecutionRequest, ExecutionResult } from '../domain/execution';
import type { ConcurrencyLimiter } from '../lib/concurrency-limiter';

export class ExecutionService {
  constructor(
    private readonly runner: CodeRunner,
    private readonly limiter: ConcurrencyLimiter,
  ) {}

  execute(request: ExecutionRequest): Promise<ExecutionResult> {
    return this.limiter.run(() => this.runner.run(request));
  }
}
