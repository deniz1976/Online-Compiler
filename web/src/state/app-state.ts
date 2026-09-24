import type { CppStandard, ExecutionLimits, ExecutionResult, User } from '../api/types';

export type RunPhase = 'idle' | 'running' | 'done' | 'failed';

export interface AppState {
  user: User | null;
  limits: ExecutionLimits;
  title: string;
  standard: CppStandard;
  stdin: string;
  sourceBytes: number;
  snippetId: string | null;
  dirty: boolean;
  phase: RunPhase;
  result: ExecutionResult | null;
  saving: boolean;
}

export const FALLBACK_LIMITS: ExecutionLimits = {
  standards: ['c++98', 'c++11', 'c++14', 'c++17', 'c++20', 'c++23'],
  defaultStandard: 'c++17',
  compileTimeoutMs: 10000,
  runTimeoutMs: 3000,
  memoryMb: 512,
  maxOutputBytes: 65536,
  maxSourceBytes: 65536,
  maxStdinBytes: 65536,
};

export const DEFAULT_TITLE = 'Untitled';

export const STARTER_SOURCE = `#include <iostream>
#include <vector>

int main() {
    int n;
    std::cin >> n;
    std::vector<bool> sieve(n + 1, true);

    for (int i = 2; i * i <= n; ++i)
        if (sieve[i])
            for (int j = i * i; j <= n; j += i)
                sieve[j] = false;

    for (int i = 2; i <= n; ++i)
        if (sieve[i]) std::cout << i << ' ';
    std::cout << '\\n';
}
`;

export const STARTER_STDIN = '30';
