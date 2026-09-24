import { Api } from './api/api';
import { ApiError } from './api/http';
import type { CppStandard, SnippetInput, User } from './api/types';
import { parseCompilerOutput } from './domain/diagnostics';
import { byteLength, formatBytes } from './domain/format';
import { BUSY_LEDS, IDLE_LEDS, ledsFor, statusLabel } from './domain/results';
import { createEditor, type SourceEditor } from './editor/editor';
import {
  DEFAULT_TITLE,
  FALLBACK_LIMITS,
  STARTER_SOURCE,
  STARTER_STDIN,
  type AppState,
} from './state/app-state';
import { loadDraft, saveDraft } from './state/draft';
import { Store } from './state/store';
import { createAuthDialog, type AuthDialog } from './ui/auth-dialog';
import { armConfirm, byId } from './ui/dom';
import { createLimitMeters } from './ui/limit-meters';
import { createMessageStrip, type MessageStrip } from './ui/message-strip';
import { createOutputScreen } from './ui/output-screen';
import { createSnippetsDialog, type SnippetsDialog, type SnippetsDialogHandlers } from './ui/snippets-dialog';
import { createStandardDial, type StandardDial } from './ui/standard-dial';
import { renderLeds } from './ui/status-leds';
import { createThemeSwitch } from './ui/theme-switch';

const EMPTY_SOURCE = '#include <iostream>\n\nint main() {\n    \n}\n';
const DRAFT_SAVE_DELAY_MS = 400;

export class App {
  private readonly api = new Api();
  private readonly store: Store<AppState>;
  private readonly editor: SourceEditor;
  private readonly dial: StandardDial;
  private readonly messages: MessageStrip;
  private readonly auth: AuthDialog;
  private readonly snippets: SnippetsDialog;
  private readonly titleInput = byId<HTMLInputElement>('title-input');
  private readonly stdinInput = byId<HTMLTextAreaElement>('stdin');
  private readonly runButton = byId<HTMLButtonElement>('run-button');
  private readonly saveButton = byId<HTMLButtonElement>('save-button');
  private readonly accountButton = byId<HTMLButtonElement>('account-button');
  private runError: string | null = null;
  private draftTimer: number | undefined;

  constructor() {
    const draft = loadDraft();
    const source = draft?.source ?? STARTER_SOURCE;

    this.store = new Store<AppState>({
      user: null,
      limits: FALLBACK_LIMITS,
      title: draft?.title ?? DEFAULT_TITLE,
      standard: draft?.standard ?? FALLBACK_LIMITS.defaultStandard,
      stdin: draft?.stdin ?? STARTER_STDIN,
      sourceBytes: byteLength(source),
      snippetId: draft?.snippetId ?? null,
      dirty: draft?.dirty ?? false,
      phase: 'idle',
      result: null,
      saving: false,
    });

    this.messages = createMessageStrip(byId('message-strip'));
    this.auth = createAuthDialog(this.api);
    this.snippets = createSnippetsDialog(this.api, this.snippetHandlers());
    this.editor = createEditor({
      parent: byId('editor'),
      source,
      onChange: (next) => this.store.update({ sourceBytes: byteLength(next), dirty: true }),
      onRun: () => void this.run(),
      onSave: () => void this.save(),
    });
    this.dial = createStandardDial(byId('standard-dial'), (standard) =>
      this.store.update({ standard, dirty: true }),
    );

    this.titleInput.value = this.store.get().title;
    this.stdinInput.value = this.store.get().stdin;
    createThemeSwitch(byId('theme-switch'));
    this.bindControls();
    this.bindState();
  }

  async start(): Promise<void> {
    this.messages.show('Warming up');

    const [limits, user] = await Promise.all([
      this.api.limits().catch(() => FALLBACK_LIMITS),
      this.api.currentUser().catch(() => null),
    ]);

    const { standard } = this.store.get();
    this.store.update({
      limits,
      user,
      standard: limits.standards.includes(standard) ? standard : limits.defaultStandard,
    });

    this.messages.show(user ? `Ready · signed in as ${user.username}` : 'Ready · log in to run code');
  }

  private bindControls(): void {
    this.runButton.addEventListener('click', () => void this.run());
    this.saveButton.addEventListener('click', () => void this.save());
    byId('snippets-button').addEventListener('click', () => void this.openSnippets());

    this.accountButton.addEventListener('click', () => {
      if (!this.store.get().user) {
        void this.signIn();
        return;
      }
      armConfirm(this.accountButton, 'Log out?', () => void this.logout());
    });

    this.titleInput.addEventListener('input', () =>
      this.store.update({ title: this.titleInput.value, dirty: true }),
    );

    this.stdinInput.addEventListener('input', () => this.store.update({ stdin: this.stdinInput.value }));

    document.addEventListener('keydown', (event) => {
      if (!(event.ctrlKey || event.metaKey) || event.defaultPrevented) {
        return;
      }
      if (event.key === 'Enter') {
        event.preventDefault();
        void this.run();
      } else if (event.key.toLowerCase() === 's') {
        event.preventDefault();
        void this.save();
      }
    });
  }

  private bindState(): void {
    const outputScreen = createOutputScreen(byId('output'), byId('output-tag'), (line, column) =>
      this.editor.revealLine(line, column),
    );
    const meters = createLimitMeters(byId('meters'));
    const leds = byId('status-leds');

    this.store.select(
      (state) => state.limits,
      (limits) => this.dial.setStandards(limits.standards, this.store.get().standard),
    );
    this.store.select((state) => state.standard, (standard) => this.dial.setValue(standard));

    this.store.subscribe((state, previous) => {
      if (state.phase !== previous.phase || state.result !== previous.result || state.limits !== previous.limits) {
        const running = state.phase === 'running';
        outputScreen.render(state.phase, state.result, this.runError);
        meters.render(state.limits, running ? null : state.result, running);
        renderLeds(leds, running ? BUSY_LEDS : state.result ? ledsFor(state.result) : IDLE_LEDS);
        this.runButton.disabled = running;
        this.runButton.setAttribute('aria-busy', String(running));
      }
    });
    const initial = this.store.get();
    outputScreen.render(initial.phase, initial.result, null);
    meters.render(initial.limits, null, false);
    renderLeds(leds, IDLE_LEDS);

    this.store.select((state) => state.user, (user) => this.renderAccount(user));
    this.store.select((state) => state.dirty, (dirty) => {
      byId('dirty-dot').hidden = !dirty;
    });
    this.store.select((state) => state.saving, (saving) => {
      this.saveButton.disabled = saving;
    });

    this.store.subscribe((state) => {
      this.renderSize('source-size', state.sourceBytes, state.limits.maxSourceBytes);
      this.renderSize('stdin-size', byteLength(state.stdin), state.limits.maxStdinBytes);
      this.scheduleDraftSave();
    });
    this.renderSize('source-size', initial.sourceBytes, initial.limits.maxSourceBytes);
    this.renderSize('stdin-size', byteLength(initial.stdin), initial.limits.maxStdinBytes);
  }

  private renderAccount(user: User | null): void {
    this.accountButton.textContent = user ? user.username : 'Log in';
    this.accountButton.title = user ? `Signed in as ${user.email}` : 'Log in or create an account';
  }

  private renderSize(id: string, bytes: number, limit: number): void {
    const target = byId(id);
    target.textContent = formatBytes(bytes);
    target.dataset.over = String(bytes > limit);
  }

  private async run(): Promise<void> {
    const state = this.store.get();
    if (state.phase === 'running') {
      return;
    }

    if (!(await this.ensureSignedIn('Log in to run code in the sandbox.'))) {
      return;
    }

    const source = this.editor.getSource();
    const { stdin, standard, limits } = this.store.get();

    if (source.trim().length === 0) {
      this.messages.show('Write some code before running', 'bad');
      return;
    }
    if (byteLength(source) > limits.maxSourceBytes) {
      this.messages.show(`Source is larger than ${formatBytes(limits.maxSourceBytes)}`, 'bad');
      return;
    }
    if (byteLength(stdin) > limits.maxStdinBytes) {
      this.messages.show(`Input is larger than ${formatBytes(limits.maxStdinBytes)}`, 'bad');
      return;
    }

    this.runError = null;
    this.editor.clearDiagnostics();
    this.store.update({ phase: 'running', result: null });
    this.messages.show(`Running · ${standard.toUpperCase()}`);

    try {
      const result = await this.api.execute({ source, stdin, standard });
      this.store.update({ phase: 'done', result });
      this.editor.showDiagnostics(parseCompilerOutput(result.compileOutput));
      this.messages.show(statusLabel(result.status), result.status === 'success' ? 'ok' : 'bad');
    } catch (error) {
      this.runError = this.describeError(error);
      this.store.update({ phase: 'failed', result: null });
      this.messages.show(this.runError, 'bad');
      if (error instanceof ApiError && error.isUnauthorized) {
        this.store.update({ user: null });
      }
    }
  }

  private async save(): Promise<void> {
    if (this.store.get().saving) {
      return;
    }

    if (!(await this.ensureSignedIn('Log in to save snippets to your account.'))) {
      return;
    }

    const { snippetId, standard } = this.store.get();
    const title = this.titleInput.value.trim() || DEFAULT_TITLE;
    const input: SnippetInput = { title, source: this.editor.getSource(), standard };

    this.store.update({ saving: true });

    try {
      const snippet = snippetId
        ? await this.api.updateSnippet(snippetId, input).catch((error: unknown) => {
            if (error instanceof ApiError && error.status === 404) {
              return this.api.createSnippet(input);
            }
            throw error;
          })
        : await this.api.createSnippet(input);

      this.titleInput.value = snippet.title;
      this.store.update({ snippetId: snippet.id, title: snippet.title, dirty: false });
      this.messages.show(`Saved "${snippet.title}"`, 'ok');
    } catch (error) {
      this.handleError(error);
    } finally {
      this.store.update({ saving: false });
    }
  }

  private async openSnippets(): Promise<void> {
    if (!(await this.ensureSignedIn('Log in to see your saved snippets.'))) {
      return;
    }

    await this.snippets.open();
  }

  private snippetHandlers(): SnippetsDialogHandlers {
    return {
      isDirty: () => this.store.get().dirty,
      currentSnippetId: () => this.store.get().snippetId,
      onLoad: async (id: string) => {
        const snippet = await this.api.getSnippet(id);
        this.replaceDocument(snippet.title, snippet.source, snippet.standard, snippet.id);
        this.messages.show(`Loaded "${snippet.title}"`, 'ok');
      },
      onNew: () => {
        this.replaceDocument(DEFAULT_TITLE, EMPTY_SOURCE, this.store.get().limits.defaultStandard, null);
        this.messages.show('New snippet');
      },
      onDeleted: (id: string) => {
        if (this.store.get().snippetId === id) {
          this.store.update({ snippetId: null, dirty: true });
        }
        this.messages.show('Snippet deleted', 'ok');
      },
      onError: (error: unknown) => this.handleError(error),
    };
  }

  private replaceDocument(title: string, source: string, standard: CppStandard, snippetId: string | null): void {
    this.editor.setSource(source);
    this.titleInput.value = title;
    this.store.update({
      title,
      standard,
      snippetId,
      dirty: false,
      phase: 'idle',
      result: null,
      sourceBytes: byteLength(source),
    });
    this.editor.focus();
  }

  private async ensureSignedIn(note: string): Promise<boolean> {
    if (this.store.get().user) {
      return true;
    }

    const user = await this.auth.open(note);
    if (!user) {
      return false;
    }

    this.store.update({ user });
    this.messages.show(`Signed in as ${user.username}`, 'ok');
    return true;
  }

  private async signIn(): Promise<void> {
    const user = await this.auth.open();
    if (user) {
      this.store.update({ user });
      this.messages.show(`Signed in as ${user.username}`, 'ok');
    }
  }

  private async logout(): Promise<void> {
    try {
      await this.api.logout();
    } finally {
      this.store.update({ user: null });
      this.messages.show('Signed out');
    }
  }

  private handleError(error: unknown): void {
    if (error instanceof ApiError && error.isUnauthorized) {
      this.store.update({ user: null });
      this.messages.show('Your session has ended. Log in again to continue.', 'bad');
      return;
    }
    this.messages.show(this.describeError(error), 'bad');
  }

  private describeError(error: unknown): string {
    if (error instanceof ApiError) {
      if (error.isUnauthorized) {
        return 'Your session has ended. Log in again to continue.';
      }
      if (error.status === 429) {
        return 'Too many runs in a short time. Wait a moment and try again.';
      }
      if (error.status === 503) {
        return 'The sandbox is busy. Try again in a few seconds.';
      }
      return error.message;
    }
    return 'Something went wrong. Please try again.';
  }

  private scheduleDraftSave(): void {
    window.clearTimeout(this.draftTimer);
    this.draftTimer = window.setTimeout(() => {
      const { title, stdin, standard, snippetId, dirty } = this.store.get();
      saveDraft({ title, source: this.editor.getSource(), stdin, standard, snippetId, dirty });
    }, DRAFT_SAVE_DELAY_MS);
  }
}
