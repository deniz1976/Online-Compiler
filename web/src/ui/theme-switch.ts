import { applyTheme, currentTheme, THEMES } from '../theme/themes';
import { el } from './dom';

export function createThemeSwitch(host: HTMLElement): void {
  const buttons = THEMES.map((theme) => {
    const button = el('button', {
      type: 'button',
      role: 'radio',
      class: 'swatch',
      'data-swatch': theme.id,
      'aria-label': `${theme.name} theme`,
      title: `${theme.name}: ${theme.description}`,
    });
    button.addEventListener('click', () => select(theme.id, false));
    return button;
  });

  const select = (id: string, focus: boolean) => {
    applyTheme(id);
    buttons.forEach((button) => {
      const checked = button.dataset.swatch === id;
      button.setAttribute('aria-checked', String(checked));
      button.tabIndex = checked ? 0 : -1;
      if (checked && focus) {
        button.focus();
      }
    });
  };

  host.addEventListener('keydown', (event) => {
    const offset = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
    if (offset === undefined) {
      return;
    }
    event.preventDefault();
    const index = THEMES.findIndex((theme) => theme.id === currentTheme());
    const next = THEMES[(index + offset + THEMES.length) % THEMES.length];
    if (next) {
      select(next.id, true);
    }
  });

  host.append(...buttons);
  select(currentTheme(), false);
}
