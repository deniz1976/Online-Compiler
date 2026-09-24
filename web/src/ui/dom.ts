type Child = Node | string | null | undefined | false;

type Props = Record<string, string | number | boolean | undefined> & {
  class?: string;
  text?: string;
};

export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);

  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) {
      continue;
    }
    if (key === 'class') {
      element.className = String(value);
    } else if (key === 'text') {
      element.textContent = String(value);
    } else {
      element.setAttribute(key, value === true ? '' : String(value));
    }
  }

  element.append(...children.filter((child): child is Node | string => Boolean(child)));
  return element;
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element #${id}`);
  }
  return element as T;
}

export function armConfirm(
  button: HTMLButtonElement,
  confirmLabel: string,
  action: () => void,
  timeoutMs = 3000,
): void {
  if (button.dataset.armed === 'true') {
    delete button.dataset.armed;
    action();
    return;
  }

  const original = button.textContent ?? '';
  button.dataset.armed = 'true';
  button.textContent = confirmLabel;

  window.setTimeout(() => {
    if (button.dataset.armed === 'true') {
      delete button.dataset.armed;
      button.textContent = original;
    }
  }, timeoutMs);
}
