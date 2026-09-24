export type MessageTone = 'info' | 'ok' | 'bad';

export interface MessageStrip {
  show(text: string, tone?: MessageTone): void;
}

export function createMessageStrip(host: HTMLElement): MessageStrip {
  return {
    show(text, tone = 'info') {
      host.textContent = text;
      host.dataset.tone = tone;
    },
  };
}
