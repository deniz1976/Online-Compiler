import { describe, expect, it } from 'vitest';
import { diagnosticLocation, parseCompilerOutput } from '../src/domain/diagnostics';

const output = [
  "main.cpp: In function 'int main()':",
  "main.cpp:5:12: error: 'x' was not declared in this scope",
  '    5 |     return x;',
  "main.cpp:3:9: warning: unused variable 'y' [-Wunused-variable]",
  "main.cpp:1:1: note: in expansion of macro 'X'",
  'main.cpp:2:1: fatal error: missing.h: No such file or directory',
].join('\n');

describe('compiler diagnostics', () => {
  it('extracts located diagnostics with severities', () => {
    expect(parseCompilerOutput(output)).toEqual([
      { line: 5, column: 12, severity: 'error', message: "'x' was not declared in this scope" },
      { line: 3, column: 9, severity: 'warning', message: "unused variable 'y' [-Wunused-variable]" },
      { line: 1, column: 1, severity: 'info', message: "in expansion of macro 'X'" },
      { line: 2, column: 1, severity: 'error', message: 'missing.h: No such file or directory' },
    ]);
  });

  it('locates a single diagnostic line', () => {
    expect(diagnosticLocation("main.cpp:5:12: error: 'x' was not declared")).toEqual({ line: 5, column: 12 });
    expect(diagnosticLocation('    5 |     return x;')).toBeNull();
  });
});
