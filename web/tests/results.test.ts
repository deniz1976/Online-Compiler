import { describe, expect, it } from 'vitest';
import type { ExecutionResult } from '../src/api/types';
import { describeExit, ledsFor } from '../src/domain/results';

const result = (overrides: Partial<ExecutionResult>): ExecutionResult => ({
  status: 'success',
  compileOutput: '',
  stdout: '',
  stderr: '',
  exitCode: 0,
  metrics: { compileMs: 1, wallMs: 1, cpuMs: 1, memoryKb: 1 },
  ...overrides,
});

describe('result presentation', () => {
  it('lights the panel for each status', () => {
    expect(ledsFor(result({ status: 'success' }))).toMatchObject({ compile: 'ok', run: 'ok', tle: 'off' });
    expect(ledsFor(result({ status: 'compilation_error' }))).toMatchObject({ compile: 'bad', run: 'off' });
    expect(ledsFor(result({ status: 'time_limit_exceeded' }))).toMatchObject({ run: 'bad', tle: 'bad' });
    expect(ledsFor(result({ status: 'memory_limit_exceeded' }))).toMatchObject({ run: 'bad', mle: 'bad' });
    expect(ledsFor(result({ status: 'output_limit_exceeded' }))).toMatchObject({ run: 'bad', out: 'bad' });
  });

  it('describes how the program ended', () => {
    expect(describeExit(result({ exitCode: 0 }))).toBe('Stdout · Exit 0');
    expect(describeExit(result({ status: 'runtime_error', exitCode: 139 }))).toBe('Stdout · Signal 11');
    expect(describeExit(result({ status: 'compilation_error', exitCode: 1 }))).toBe('Compiler');
    expect(describeExit(result({ status: 'output_limit_exceeded', exitCode: null }))).toBe('Stdout');
  });
});
