export type Listener<T> = (state: T, previous: T) => void;

export class Store<T extends object> {
  private listeners = new Set<Listener<T>>();

  constructor(private state: T) {}

  get(): T {
    return this.state;
  }

  update(changes: Partial<T>): void {
    const previous = this.state;
    this.state = { ...previous, ...changes };
    this.listeners.forEach((listener) => listener(this.state, previous));
  }

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  select<K>(selector: (state: T) => K, listener: (value: K) => void): () => void {
    listener(selector(this.state));
    return this.subscribe((state, previous) => {
      const next = selector(state);
      if (!Object.is(next, selector(previous))) {
        listener(next);
      }
    });
  }
}
