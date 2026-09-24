import type { CppStandard } from './cpp';

export const EXECUTION_STATUSES = [
  'success',
  'compilation_error',
  'runtime_error',
  'time_limit_exceeded',
  'memory_limit_exceeded',
  'output_limit_exceeded',
] as const;

export type ExecutionStatus = (typeof EXECUTION_STATUSES)[number];

export interface ExecutionRequest {
  source: string;
  stdin: string;
  standard: CppStandard;
}

export interface ExecutionResult {
  status: ExecutionStatus;
  compileOutput: string;
  stdout: string;
  stderr: string;
  exitCode: number | null;
  metrics: ExecutionMetrics;
}

export interface ExecutionMetrics {
  compileMs: number | null;
  wallMs: number | null;
  cpuMs: number | null;
  memoryKb: number | null;
}

export const EMPTY_METRICS: ExecutionMetrics = {
  compileMs: null,
  wallMs: null,
  cpuMs: null,
  memoryKb: null,
};

export interface CodeRunner {
  run(request: ExecutionRequest): Promise<ExecutionResult>;
}
