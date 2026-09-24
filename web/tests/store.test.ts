import { describe, expect, it, vi } from 'vitest';
import { Store } from '../src/state/store';

describe('Store', () => {
  it('notifies subscribers with the next and previous state', () => {
    const store = new Store({ count: 0, label: 'a' });
    const listener = vi.fn();
    store.subscribe(listener);

    store.update({ count: 1 });

    expect(listener).toHaveBeenCalledWith({ count: 1, label: 'a' }, { count: 0, label: 'a' });
  });

  it('only calls selectors when the selected value changes', () => {
    const store = new Store({ count: 0, label: 'a' });
    const listener = vi.fn();
    store.select((state) => state.label, listener);

    store.update({ count: 1 });
    store.update({ label: 'b' });

    expect(listener.mock.calls).toEqual([['a'], ['b']]);
  });
});
