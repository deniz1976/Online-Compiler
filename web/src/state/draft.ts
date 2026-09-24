import type { CppStandard } from '../api/types';

const DRAFT_KEY = 'oc.draft';

export interface Draft {
  title: string;
  source: string;
  stdin: string;
  standard: CppStandard;
  snippetId: string | null;
  dirty: boolean;
}

export function loadDraft(): Draft | null {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return null;
    }
    const draft = JSON.parse(raw) as Partial<Draft>;
    if (typeof draft.source !== 'string' || typeof draft.standard !== 'string') {
      return null;
    }
    return {
      title: typeof draft.title === 'string' ? draft.title : '',
      source: draft.source,
      stdin: typeof draft.stdin === 'string' ? draft.stdin : '',
      standard: draft.standard,
      snippetId: typeof draft.snippetId === 'string' ? draft.snippetId : null,
      dirty: draft.dirty === true,
    };
  } catch {
    return null;
  }
}

export function saveDraft(draft: Draft): void {
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    return;
  }
}
