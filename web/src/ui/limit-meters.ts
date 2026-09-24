import type { ExecutionLimits, ExecutionResult } from '../api/types';
import { byteLength, formatBytes, formatDuration, formatMemoryKb } from '../domain/format';
import { el } from './dom';

const SEGMENTS = 24;
const HOT_FRACTION = 0.75;

interface Meter {
  readout: HTMLElement;
  segments: HTMLElement[];
}

export interface LimitMeters {
  render(limits: ExecutionLimits, result: ExecutionResult | null, running: boolean): void;
}

export function createLimitMeters(host: HTMLElement): LimitMeters {
  const createMeter = (label: string): Meter => {
    const readout = el('b', { class: 'meter-readout' });
    const segments = Array.from({ length: SEGMENTS }, () => el('i'));
    host.append(
      el(
        'div',
        { class: 'meter' },
        el('div', { class: 'meter-row' }, el('span', { text: label }), readout),
        el('div', { class: 'segments', 'aria-hidden': 'true' }, ...segments),
      ),
    );
    return { readout, segments };
  };

  const time = createMeter('Time');
  const memory = createMeter('Memory');
  const output = createMeter('Output');
  const extras = el('dl', { class: 'meter-extras' });
  const cpu = el('dd');
  const compile = el('dd');
  extras.append(el('div', {}, el('dt', { text: 'CPU' }), cpu), el('div', {}, el('dt', { text: 'Compile' }), compile));
  host.append(extras);

  const fill = (meter: Meter, fraction: number | null, exceeded: boolean, running: boolean) => {
    const lit = fraction === null ? 0 : Math.max(Math.ceil(Math.min(fraction, 1) * SEGMENTS), fraction > 0 ? 1 : 0);

    meter.segments.forEach((segment, index) => {
      let state = '';
      if (exceeded) {
        state = 'over';
      } else if (running) {
        state = 'scan';
      } else if (index < lit) {
        state = index >= SEGMENTS * HOT_FRACTION ? 'hot' : 'on';
      }
      segment.className = state;
      segment.style.setProperty('--i', String(index));
    });
  };

  return {
    render(limits, result, running) {
      const metrics = result?.metrics;
      const status = result?.status;
      const outputBytes = result ? byteLength(result.stdout) + byteLength(result.stderr) : null;
      const memoryLimitKb = limits.memoryMb * 1024;

      time.readout.textContent = `${metrics?.wallMs != null ? formatDuration(metrics.wallMs) : '—'} / ${formatDuration(limits.runTimeoutMs)}`;
      memory.readout.textContent = `${metrics?.memoryKb != null ? formatMemoryKb(metrics.memoryKb) : '—'} / ${limits.memoryMb} MB`;
      output.readout.textContent = `${outputBytes !== null && status !== 'compilation_error' ? formatBytes(outputBytes) : '—'} / ${formatBytes(limits.maxOutputBytes)}`;

      fill(time, metrics?.wallMs != null ? metrics.wallMs / limits.runTimeoutMs : null, status === 'time_limit_exceeded', running);
      fill(memory, metrics?.memoryKb != null ? metrics.memoryKb / memoryLimitKb : null, status === 'memory_limit_exceeded', running);
      fill(
        output,
        outputBytes !== null && status !== 'compilation_error' ? outputBytes / limits.maxOutputBytes : null,
        status === 'output_limit_exceeded',
        running,
      );

      cpu.textContent = metrics?.cpuMs != null ? formatDuration(metrics.cpuMs) : '—';
      compile.textContent = metrics?.compileMs != null ? formatDuration(metrics.compileMs) : '—';
    },
  };
}
