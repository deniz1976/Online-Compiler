import type { ExecutionResult } from '../api/types';
import { diagnosticLocation } from '../domain/diagnostics';
import { formatDuration, formatMemoryKb } from '../domain/format';
import { describeExit, statusLabel } from '../domain/results';
import type { RunPhase } from '../state/app-state';
import { el } from './dom';

export interface OutputScreen {
  render(phase: RunPhase, result: ExecutionResult | null, error: string | null): void;
}

export function createOutputScreen(
  host: HTMLElement,
  tag: HTMLElement,
  onJump: (line: number, column: number) => void,
): OutputScreen {
  const compilerBlock = (output: string) =>
    el(
      'pre',
      { class: 'out-compiler' },
      ...output.split('\n').map((line) => {
        const location = diagnosticLocation(line);
        if (!location) {
          return el('span', { class: 'out-line', text: line || ' ' });
        }
        const button = el('button', {
          type: 'button',
          class: `out-line diag ${/:\s(fatal error|error):/.test(line) ? 'is-error' : 'is-warning'}`,
          title: `Go to line ${location.line}`,
          text: line,
        });
        button.addEventListener('click', () => onJump(location.line, location.column));
        return button;
      }),
    );

  const summary = (result: ExecutionResult) => {
    const { metrics } = result;
    const parts = [statusLabel(result.status)];
    if (metrics.wallMs !== null) {
      parts.push(formatDuration(metrics.wallMs));
    }
    if (metrics.cpuMs !== null) {
      parts.push(`cpu ${formatDuration(metrics.cpuMs)}`);
    }
    if (metrics.memoryKb !== null) {
      parts.push(formatMemoryKb(metrics.memoryKb));
    }
    if (metrics.compileMs !== null) {
      parts.push(`compiled in ${formatDuration(metrics.compileMs)}`);
    }
    return el('p', { class: `out-summary is-${result.status === 'success' ? 'ok' : 'bad'}`, text: parts.join(' · ') });
  };

  return {
    render(phase, result, error) {
      host.replaceChildren();
      host.dataset.phase = phase;

      if (phase === 'running') {
        tag.textContent = 'Output';
        host.append(el('p', { class: 'out-dim out-busy', text: 'Compiling and running in the sandbox' }));
        return;
      }

      if (phase === 'failed') {
        tag.textContent = 'Output';
        host.append(el('p', { class: 'out-error', text: error ?? 'The run could not be completed.' }));
        return;
      }

      if (!result) {
        tag.textContent = 'Output';
        host.append(el('p', { class: 'out-dim', text: 'Press Run or Ctrl+Enter to compile and execute.' }));
        return;
      }

      tag.textContent = describeExit(result);

      if (result.status === 'compilation_error') {
        host.append(compilerBlock(result.compileOutput.trimEnd()), summary(result));
        return;
      }

      host.append(
        result.stdout.length > 0
          ? el('pre', { class: 'out-stdout', text: result.stdout })
          : el('p', { class: 'out-dim', text: 'The program printed nothing.' }),
      );

      if (result.stderr.length > 0) {
        host.append(el('span', { class: 'out-label', text: 'Stderr' }), el('pre', { class: 'out-stderr', text: result.stderr }));
      }

      if (result.compileOutput.trim().length > 0) {
        host.append(el('span', { class: 'out-label', text: 'Compiler warnings' }), compilerBlock(result.compileOutput.trimEnd()));
      }

      host.append(summary(result));
    },
  };
}
