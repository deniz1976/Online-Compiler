import { autocompletion, closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { cpp } from '@codemirror/lang-cpp';
import { bracketMatching, indentOnInput, indentUnit, syntaxHighlighting } from '@codemirror/language';
import { lintGutter, setDiagnostics, type Diagnostic } from '@codemirror/lint';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { EditorState } from '@codemirror/state';
import {
  EditorView,
  drawSelection,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
} from '@codemirror/view';
import type { CompilerDiagnostic } from '../domain/diagnostics';
import { cppCompletions } from './completions';
import { benchHighlightStyle } from './highlight';

export interface EditorOptions {
  parent: HTMLElement;
  source: string;
  onChange: (source: string) => void;
  onRun: () => void;
  onSave: () => void;
}

export interface SourceEditor {
  getSource(): string;
  setSource(source: string): void;
  showDiagnostics(diagnostics: CompilerDiagnostic[]): void;
  clearDiagnostics(): void;
  revealLine(line: number, column?: number): void;
  focus(): void;
}

const benchTheme = EditorView.theme({
  '&': { height: '100%', color: 'var(--screen-text)', backgroundColor: 'transparent' },
  '.cm-scroller': { fontFamily: 'var(--font-mono)', lineHeight: '1.75' },
  '.cm-content': { caretColor: 'var(--cursor)', padding: '12px 0' },
  '.cm-cursor, .cm-dropCursor': { borderLeftColor: 'var(--cursor)', borderLeftWidth: '2px' },
  '&.cm-focused': { outline: 'none' },
  '.cm-selectionBackground, &.cm-focused > .cm-scroller > .cm-selectionLayer .cm-selectionBackground, ::selection': {
    backgroundColor: 'var(--selection)',
  },
  '.cm-activeLine': { backgroundColor: 'var(--active-line)' },
  '.cm-gutters': { backgroundColor: 'transparent', color: 'var(--screen-dim)', border: 'none' },
  '.cm-activeLineGutter': { backgroundColor: 'transparent', color: 'var(--screen-text)' },
  '.cm-lineNumbers .cm-gutterElement': { padding: '0 12px 0 8px', minWidth: '3ch' },
  '.cm-matchingBracket': { backgroundColor: 'var(--selection)', outline: '1px solid var(--screen-dim)' },
  '.cm-selectionMatch': { backgroundColor: 'var(--active-line)' },
  '.cm-tooltip': {
    backgroundColor: 'var(--panel)',
    color: 'var(--label-strong)',
    border: '1px solid var(--panel-edge)',
    borderRadius: '4px',
    fontFamily: 'var(--font-mono)',
  },
  '.cm-tooltip-autocomplete > ul > li[aria-selected]': {
    backgroundColor: 'var(--selection)',
    color: 'var(--screen-text)',
  },
  '.cm-completionDetail': { color: 'var(--label)', fontStyle: 'normal', marginLeft: '1ch' },
  '.cm-diagnostic-error': { borderLeftColor: 'var(--led-bad)' },
  '.cm-diagnostic-warning': { borderLeftColor: 'var(--led-busy)' },
  '.cm-lintRange-error': { backgroundImage: 'none', textDecoration: 'underline wavy var(--led-bad)' },
  '.cm-lintRange-warning': { backgroundImage: 'none', textDecoration: 'underline wavy var(--led-busy)' },
  '.cm-gutter-lint': { width: '10px' },
  '.cm-lint-marker': { width: '8px', height: '8px' },
});

export function createEditor(options: EditorOptions): SourceEditor {
  const shortcuts = keymap.of([
    { key: 'Mod-Enter', run: () => (options.onRun(), true), preventDefault: true },
    { key: 'Mod-s', run: () => (options.onSave(), true), preventDefault: true },
  ]);

  const view = new EditorView({
    parent: options.parent,
    state: EditorState.create({
      doc: options.source,
      extensions: [
        shortcuts,
        lineNumbers(),
        highlightActiveLineGutter(),
        lintGutter(),
        history(),
        drawSelection(),
        indentUnit.of('    '),
        EditorState.tabSize.of(4),
        indentOnInput(),
        bracketMatching(),
        closeBrackets(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        autocompletion({ override: [cppCompletions], icons: false }),
        cpp(),
        syntaxHighlighting(benchHighlightStyle),
        benchTheme,
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...completionKeymap,
          indentWithTab,
        ]),
        EditorView.contentAttributes.of({ 'aria-label': 'C++ source code' }),
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            options.onChange(update.state.doc.toString());
          }
        }),
      ],
    }),
  });

  const toDiagnostic = (diagnostic: CompilerDiagnostic): Diagnostic | null => {
    const { doc } = view.state;
    if (diagnostic.line < 1 || diagnostic.line > doc.lines) {
      return null;
    }

    const line = doc.line(diagnostic.line);
    const from = Math.min(line.from + Math.max(diagnostic.column - 1, 0), line.to);
    const wordEnd = /^\w+/.exec(doc.sliceString(from, line.to))?.[0].length ?? 1;

    return {
      from,
      to: Math.min(from + wordEnd, line.to),
      severity: diagnostic.severity,
      message: diagnostic.message,
    };
  };

  return {
    getSource: () => view.state.doc.toString(),
    setSource(source) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: source },
        selection: { anchor: 0 },
        scrollIntoView: true,
      });
      view.dispatch(setDiagnostics(view.state, []));
    },
    showDiagnostics(diagnostics) {
      const mapped = diagnostics.map(toDiagnostic).filter((item): item is Diagnostic => item !== null);
      view.dispatch(setDiagnostics(view.state, mapped));
    },
    clearDiagnostics() {
      view.dispatch(setDiagnostics(view.state, []));
    },
    revealLine(lineNumber, column = 1) {
      const { doc } = view.state;
      const line = doc.line(Math.min(Math.max(lineNumber, 1), doc.lines));
      const anchor = Math.min(line.from + column - 1, line.to);
      view.dispatch({ selection: { anchor }, scrollIntoView: true });
      view.focus();
    },
    focus: () => view.focus(),
  };
}
