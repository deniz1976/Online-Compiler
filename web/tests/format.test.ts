import { describe, expect, it } from 'vitest';
import { byteLength, formatBytes, formatDuration, formatMemoryKb, formatRelativeDate } from '../src/domain/format';

describe('format', () => {
  it('formats byte sizes', () => {
    expect(formatBytes(27)).toBe('27 B');
    expect(formatBytes(65536)).toBe('64 KB');
    expect(formatBytes(1536)).toBe('1.5 KB');
    expect(formatMemoryKb(3481)).toBe('3.4 MB');
  });

  it('formats durations', () => {
    expect(formatDuration(70)).toBe('70 ms');
    expect(formatDuration(3000)).toBe('3 s');
    expect(formatDuration(1234)).toBe('1.23 s');
  });

  it('counts UTF-8 bytes', () => {
    expect(byteLength('abc')).toBe(3);
    expect(byteLength('é€')).toBe(5);
  });

  it('formats relative dates', () => {
    const now = new Date('2026-09-24T12:00:00Z');

    expect(formatRelativeDate('2026-09-24T11:59:30Z', now)).toBe('just now');
    expect(formatRelativeDate('2026-09-24T11:45:00Z', now)).toBe('15 min ago');
    expect(formatRelativeDate('2026-09-23T11:00:00Z', now)).toBe('yesterday');
    expect(formatRelativeDate('2026-09-01T11:00:00Z', now)).toBe('01 Sept 2026');
  });
});
