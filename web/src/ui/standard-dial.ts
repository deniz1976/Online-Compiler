import type { CppStandard } from '../api/types';
import { el } from './dom';

const SWEEP_DEGREES = 240;
const SVG_NS = 'http://www.w3.org/2000/svg';

export interface StandardDial {
  setValue(value: CppStandard): void;
  setStandards(standards: CppStandard[], value: CppStandard): void;
}

export function createStandardDial(
  host: HTMLElement,
  onChange: (value: CppStandard) => void,
): StandardDial {
  let standards: CppStandard[] = [];
  let value: CppStandard = 'c++17';
  let buttons: HTMLButtonElement[] = [];

  const face = el('div', { class: 'dial-face', role: 'radiogroup', 'aria-label': 'C++ standard' });
  const knob = createKnob();
  const readout = el('div', { class: 'dial-readout' });
  const readoutValue = el('span', { class: 'dial-value' });
  const readoutFlags = el('span', { class: 'dial-flags' });
  readout.append(readoutValue, readoutFlags);
  face.append(knob.svg);
  host.append(face, readout);

  const angleOf = (index: number) =>
    standards.length <= 1 ? 0 : -SWEEP_DEGREES / 2 + (SWEEP_DEGREES / (standards.length - 1)) * index;

  const select = (next: CppStandard, focus = false) => {
    if (next !== value) {
      value = next;
      onChange(next);
    }
    render(focus);
  };

  const render = (focus = false) => {
    const index = Math.max(standards.indexOf(value), 0);
    knob.pointer.style.transform = `rotate(${angleOf(index)}deg)`;
    readoutValue.textContent = value.toUpperCase();
    readoutFlags.textContent = `-std=${value} · -O2`;

    buttons.forEach((button, buttonIndex) => {
      const checked = buttonIndex === index;
      button.setAttribute('aria-checked', String(checked));
      button.tabIndex = checked ? 0 : -1;
      if (checked && focus) {
        button.focus();
      }
    });
  };

  face.addEventListener('keydown', (event) => {
    const index = standards.indexOf(value);
    const step = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 }[event.key];
    let nextIndex: number | undefined;

    if (step !== undefined) {
      nextIndex = Math.min(Math.max(index + step, 0), standards.length - 1);
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = standards.length - 1;
    }

    const next = nextIndex === undefined ? undefined : standards[nextIndex];
    if (next) {
      event.preventDefault();
      select(next, true);
    }
  });

  return {
    setValue(next) {
      value = next;
      render();
    },
    setStandards(nextStandards, nextValue) {
      standards = nextStandards;
      value = nextValue;
      buttons.forEach((button) => button.remove());
      buttons = standards.map((standard, index) => {
        const button = el('button', {
          type: 'button',
          role: 'radio',
          class: 'dial-mark',
          'aria-label': standard.toUpperCase(),
          text: standard.replace('c++', ''),
        });
        button.style.setProperty('--angle', `${angleOf(index)}deg`);
        button.addEventListener('click', () => select(standard, true));
        face.append(button);
        return button;
      });
      render();
    },
  };
}

function createKnob(): { svg: SVGSVGElement; pointer: SVGGElement } {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 100 100');
  svg.setAttribute('class', 'dial-knob');
  svg.setAttribute('aria-hidden', 'true');

  const ring = document.createElementNS(SVG_NS, 'circle');
  ring.setAttribute('cx', '50');
  ring.setAttribute('cy', '50');
  ring.setAttribute('r', '30');
  ring.setAttribute('class', 'knob-ring');

  const cap = document.createElementNS(SVG_NS, 'circle');
  cap.setAttribute('cx', '50');
  cap.setAttribute('cy', '50');
  cap.setAttribute('r', '22');
  cap.setAttribute('class', 'knob-cap');

  const pointer = document.createElementNS(SVG_NS, 'g');
  pointer.setAttribute('class', 'knob-pointer');
  const line = document.createElementNS(SVG_NS, 'line');
  line.setAttribute('x1', '50');
  line.setAttribute('y1', '50');
  line.setAttribute('x2', '50');
  line.setAttribute('y2', '28');
  pointer.append(line);

  const hub = document.createElementNS(SVG_NS, 'circle');
  hub.setAttribute('cx', '50');
  hub.setAttribute('cy', '50');
  hub.setAttribute('r', '4');
  hub.setAttribute('class', 'knob-hub');

  svg.append(ring, cap, pointer, hub);
  return { svg, pointer };
}
