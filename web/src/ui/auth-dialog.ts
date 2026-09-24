import type { Api } from '../api/api';
import { ApiError } from '../api/http';
import type { User } from '../api/types';
import { byId } from './dom';

type Mode = 'login' | 'register';

export interface AuthDialog {
  open(note?: string): Promise<User | null>;
}

export function createAuthDialog(api: Api): AuthDialog {
  const dialog = byId<HTMLDialogElement>('auth-dialog');
  const form = byId<HTMLFormElement>('auth-form');
  const note = byId('auth-note');
  const error = byId('auth-error');
  const submit = byId<HTMLButtonElement>('auth-submit');
  const usernameField = byId('username-field');
  const username = byId<HTMLInputElement>('auth-username');
  const email = byId<HTMLInputElement>('auth-email');
  const password = byId<HTMLInputElement>('auth-password');
  const passwordHint = byId('password-hint');
  const tabs = Array.from(dialog.querySelectorAll<HTMLButtonElement>('[data-mode]'));

  let mode: Mode = 'login';
  let settle: ((user: User | null) => void) | null = null;
  let signedIn: User | null = null;

  const setMode = (next: Mode) => {
    mode = next;
    tabs.forEach((tab) => tab.setAttribute('aria-selected', String(tab.dataset.mode === next)));
    const registering = next === 'register';
    usernameField.hidden = !registering;
    username.required = registering;
    passwordHint.hidden = !registering;
    password.autocomplete = registering ? 'new-password' : 'current-password';
    submit.textContent = registering ? 'Create account' : 'Log in';
    showError(null);
  };

  const showError = (message: string | null) => {
    error.hidden = message === null;
    error.textContent = message ?? '';
  };

  const describe = (caught: unknown): string => {
    if (!(caught instanceof ApiError)) {
      return 'Something went wrong. Please try again.';
    }
    if (caught.details.length > 0) {
      return caught.details
        .map((detail) => (detail.path ? `${detail.path}: ${detail.message}` : detail.message))
        .join('. ');
    }
    return caught.message;
  };

  tabs.forEach((tab) => tab.addEventListener('click', () => setMode(tab.dataset.mode as Mode)));
  dialog.querySelector('[data-close]')?.addEventListener('click', () => dialog.close());

  dialog.addEventListener('close', () => {
    settle?.(signedIn);
    settle = null;
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.reportValidity()) {
      return;
    }

    submit.disabled = true;
    showError(null);

    try {
      const credentials = { email: email.value.trim(), password: password.value };
      if (mode === 'register') {
        await api.register({ ...credentials, username: username.value.trim() });
      }
      signedIn = await api.login(credentials);
      password.value = '';
      dialog.close();
    } catch (caught) {
      showError(describe(caught));
    } finally {
      submit.disabled = false;
    }
  });

  return {
    open(message) {
      signedIn = null;
      note.hidden = !message;
      note.textContent = message ?? '';
      setMode('login');
      dialog.showModal();
      email.focus();
      return new Promise((resolve) => {
        settle = resolve;
      });
    },
  };
}
