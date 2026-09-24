import type { LedName, LedPanel } from '../domain/results';

const STATE_TEXT = { off: 'off', ok: 'passed', bad: 'failed', busy: 'in progress' } as const;

export function renderLeds(host: HTMLElement, panel: LedPanel): void {
  host.querySelectorAll<HTMLElement>('[data-led]').forEach((led) => {
    const name = led.dataset.led as LedName;
    const state = panel[name];
    led.dataset.state = state;
    led.setAttribute('aria-label', `${led.textContent?.trim() ?? name}: ${STATE_TEXT[state]}`);
  });
}
