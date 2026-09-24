import type { CppStandard } from '../../../src/domain/cpp';
import type { ExecutionResult } from '../../../src/domain/execution';
import type { Snippet as DomainSnippet, SnippetSummary as DomainSnippetSummary } from '../../../src/domain/snippet';
import type { PublicUser } from '../../../src/domain/user';

export type { CppStandard, ExecutionResult };
export type { ExecutionMetrics, ExecutionStatus } from '../../../src/domain/execution';

type Serialized<T> = { [K in keyof T]: T[K] extends Date ? string : T[K] };

export type User = Serialized<PublicUser>;
export type Snippet = Serialized<DomainSnippet>;
export type SnippetSummary = Serialized<DomainSnippetSummary>;

export interface ExecutionLimits {
  standards: CppStandard[];
  defaultStandard: CppStandard;
  compileTimeoutMs: number;
  runTimeoutMs: number;
  memoryMb: number;
  maxOutputBytes: number;
  maxSourceBytes: number;
  maxStdinBytes: number;
}

export interface ExecutionInput {
  source: string;
  stdin: string;
  standard: CppStandard;
}

export interface SnippetInput {
  title: string;
  source: string;
  standard: CppStandard;
}
