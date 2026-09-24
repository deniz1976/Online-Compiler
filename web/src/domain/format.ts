const KB = 1024;
const MB = KB * 1024;

export function formatBytes(bytes: number): string {
  if (bytes < KB) {
    return `${bytes} B`;
  }
  if (bytes < MB) {
    return `${trim(bytes / KB)} KB`;
  }
  return `${trim(bytes / MB)} MB`;
}

export function formatDuration(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${trim(ms / 1000, 2)} s`;
}

export function formatMemoryKb(kb: number): string {
  return formatBytes(kb * KB);
}

export function byteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

export function formatRelativeDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const seconds = Math.round((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }
  if (seconds < 3600) {
    return `${Math.floor(seconds / 60)} min ago`;
  }
  if (seconds < 86400) {
    return `${Math.floor(seconds / 3600)} h ago`;
  }
  if (seconds < 86400 * 7) {
    const days = Math.floor(seconds / 86400);
    return days === 1 ? 'yesterday' : `${days} days ago`;
  }
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function trim(value: number, digits = 1): string {
  return Number(value.toFixed(digits)).toString();
}
