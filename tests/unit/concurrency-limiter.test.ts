import { describe, expect, it } from 'vitest';
import { ServiceUnavailableError } from '../../src/errors/app-error';
import { ConcurrencyLimiter } from '../../src/lib/concurrency-limiter';

function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

describe('ConcurrencyLimiter', () => {
  it('never runs more tasks than allowed at once', async () => {
    const limiter = new ConcurrencyLimiter(2, 10);
    let running = 0;
    let peak = 0;

    const task = async () => {
      running += 1;
      peak = Math.max(peak, running);
      await new Promise((resolve) => setTimeout(resolve, 5));
      running -= 1;
    };

    await Promise.all(Array.from({ length: 8 }, () => limiter.run(task)));

    expect(peak).toBe(2);
    expect(limiter.activeCount).toBe(0);
    expect(limiter.queuedCount).toBe(0);
  });

  it('rejects work when the queue is full', async () => {
    const limiter = new ConcurrencyLimiter(1, 1);
    const gate = deferred();

    const first = limiter.run(() => gate.promise);
    const second = limiter.run(async () => 'queued');

    await expect(limiter.run(async () => 'rejected')).rejects.toBeInstanceOf(ServiceUnavailableError);

    gate.resolve();
    await first;
    await expect(second).resolves.toBe('queued');
  });

  it('releases the slot when a task fails', async () => {
    const limiter = new ConcurrencyLimiter(1, 0);

    await expect(limiter.run(() => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    await expect(limiter.run(async () => 'ok')).resolves.toBe('ok');
  });
});
