export type DiagnosticSeverity = 'error' | 'warning' | 'info';

export interface CompilerDiagnostic {
  line: number;
  column: number;
  severity: DiagnosticSeverity;
  message: string;
}

const DIAGNOSTIC_PATTERN = /^main\.cpp:(\d+):(\d+):\s+(fatal error|error|warning|note):\s+(.*)$/;

export function parseCompilerOutput(output: string): CompilerDiagnostic[] {
  const diagnostics: CompilerDiagnostic[] = [];

  for (const line of output.split('\n')) {
    const match = DIAGNOSTIC_PATTERN.exec(line);
    if (!match) {
      continue;
    }

    const [, lineNumber, column, kind, message] = match;
    diagnostics.push({
      line: Number(lineNumber),
      column: Number(column),
      severity: kind === 'note' ? 'info' : kind === 'warning' ? 'warning' : 'error',
      message: message ?? '',
    });
  }

  return diagnostics;
}

export function diagnosticLocation(line: string): { line: number; column: number } | null {
  const match = DIAGNOSTIC_PATTERN.exec(line);
  return match ? { line: Number(match[1]), column: Number(match[2]) } : null;
}
