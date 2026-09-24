import type { ExecutionResult, ExecutionStatus } from '../api/types';

export type LedName = 'compile' | 'run' | 'tle' | 'mle' | 'out';
export type LedState = 'off' | 'ok' | 'bad' | 'busy';
export type LedPanel = Record<LedName, LedState>;

export const IDLE_LEDS: LedPanel = { compile: 'off', run: 'off', tle: 'off', mle: 'off', out: 'off' };

export const BUSY_LEDS: LedPanel = { ...IDLE_LEDS, compile: 'busy' };

const STATUS_LABELS: Record<ExecutionStatus, string> = {
  success: 'Success',
  compilation_error: 'Compilation error',
  runtime_error: 'Runtime error',
  time_limit_exceeded: 'Time limit exceeded',
  memory_limit_exceeded: 'Memory limit exceeded',
  output_limit_exceeded: 'Output limit exceeded',
};

export function statusLabel(status: ExecutionStatus): string {
  return STATUS_LABELS[status];
}

export function ledsFor(result: ExecutionResult): LedPanel {
  switch (result.status) {
    case 'success':
      return { ...IDLE_LEDS, compile: 'ok', run: 'ok' };
    case 'compilation_error':
      return { ...IDLE_LEDS, compile: 'bad' };
    case 'runtime_error':
      return { ...IDLE_LEDS, compile: 'ok', run: 'bad' };
    case 'time_limit_exceeded':
      return { ...IDLE_LEDS, compile: 'ok', run: 'bad', tle: 'bad' };
    case 'memory_limit_exceeded':
      return { ...IDLE_LEDS, compile: 'ok', run: 'bad', mle: 'bad' };
    case 'output_limit_exceeded':
      return { ...IDLE_LEDS, compile: 'ok', run: 'bad', out: 'bad' };
  }
}

export function describeExit(result: ExecutionResult): string {
  if (result.status === 'compilation_error') {
    return 'Compiler';
  }
  if (result.exitCode === null) {
    return 'Stdout';
  }
  if (result.exitCode > 128) {
    return `Stdout · Signal ${result.exitCode - 128}`;
  }
  return `Stdout · Exit ${result.exitCode}`;
}
