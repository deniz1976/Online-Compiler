import type { Api } from '../api/api';
import type { SnippetSummary } from '../api/types';
import { formatRelativeDate } from '../domain/format';
import { armConfirm, byId, el } from './dom';

export interface SnippetsDialogHandlers {
  isDirty(): boolean;
  currentSnippetId(): string | null;
  onLoad(id: string): Promise<void>;
  onNew(): void;
  onDeleted(id: string): void;
  onError(error: unknown): void;
}

export interface SnippetsDialog {
  open(): Promise<void>;
}

export function createSnippetsDialog(api: Api, handlers: SnippetsDialogHandlers): SnippetsDialog {
  const dialog = byId<HTMLDialogElement>('snippets-dialog');
  const list = byId<HTMLUListElement>('snippet-list');
  const count = byId('snippet-count');
  const newButton = byId<HTMLButtonElement>('new-snippet-button');

  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());

  const discardGuard = (button: HTMLButtonElement, action: () => void) => {
    if (handlers.isDirty()) {
      armConfirm(button, 'Discard unsaved changes?', action);
    } else {
      action();
    }
  };

  newButton.addEventListener('click', () =>
    discardGuard(newButton, () => {
      handlers.onNew();
      dialog.close();
    }),
  );

  const renderItem = (snippet: SnippetSummary) => {
    const load = el(
      'button',
      { type: 'button', class: 'snippet-load' },
      el('span', { class: 'snippet-title', text: snippet.title }),
      el('span', {
        class: 'snippet-meta',
        text: `${snippet.standard.toUpperCase()} · ${formatRelativeDate(snippet.updatedAt)}`,
      }),
    );
    const remove = el('button', {
      type: 'button',
      class: 'key key-danger',
      text: 'Delete',
      'aria-label': `Delete ${snippet.title}`,
    });
    const item = el('li', { class: 'snippet-item' }, load, remove);

    if (snippet.id === handlers.currentSnippetId()) {
      item.dataset.current = 'true';
    }

    load.addEventListener('click', () =>
      discardGuard(load, async () => {
        try {
          await handlers.onLoad(snippet.id);
          dialog.close();
        } catch (error) {
          handlers.onError(error);
        }
      }),
    );

    remove.addEventListener('click', () =>
      armConfirm(remove, 'Confirm delete', async () => {
        remove.disabled = true;
        try {
          await api.deleteSnippet(snippet.id);
          handlers.onDeleted(snippet.id);
          item.remove();
          updateCount(list.children.length);
        } catch (error) {
          remove.disabled = false;
          handlers.onError(error);
        }
      }),
    );

    return item;
  };

  const updateCount = (total: number) => {
    count.textContent = total === 1 ? '1 snippet' : `${total} snippets`;
    if (total === 0) {
      list.replaceChildren(el('li', { class: 'snippet-empty', text: 'No saved snippets yet. Save your work with Ctrl+S.' }));
    }
  };

  return {
    async open() {
      list.replaceChildren(el('li', { class: 'snippet-empty', text: 'Loading snippets' }));
      count.textContent = '';
      dialog.showModal();

      try {
        const snippets = await api.listSnippets();
        list.replaceChildren(...snippets.map(renderItem));
        updateCount(snippets.length);
      } catch (error) {
        dialog.close();
        handlers.onError(error);
      }
    },
  };
}
