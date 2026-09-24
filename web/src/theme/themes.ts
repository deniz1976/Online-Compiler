export interface ScreenTheme {
  id: string;
  name: string;
  description: string;
}

export const THEMES: readonly ScreenTheme[] = [
  { id: 'amber', name: 'Amber', description: 'Warm amber phosphor on an olive bench' },
  { id: 'phosphor', name: 'Phosphor', description: 'Green P1 phosphor' },
  { id: 'arctic', name: 'Arctic', description: 'Cool blue-white display on navy' },
  { id: 'lab', name: 'Lab', description: 'Light bench for bright rooms' },
  { id: 'graphite', name: 'Graphite', description: 'High contrast' },
];

const STORAGE_KEY = 'oc.theme';

export function currentTheme(): string {
  return document.documentElement.dataset.theme ?? 'amber';
}

export function applyTheme(id: string): void {
  if (!THEMES.some((theme) => theme.id === id)) {
    return;
  }

  document.documentElement.dataset.theme = id;

  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    return;
  }
}
