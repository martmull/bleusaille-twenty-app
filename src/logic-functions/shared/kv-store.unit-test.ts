import { describe, expect, it } from 'vitest';

import { InMemoryCoreClient } from 'src/__tests__/in-memory-core-client';
import { kvDel, kvGet, kvSet } from 'src/logic-functions/shared/kv-store';

describe('kvGet', () => {
  it('returns undefined for a missing key', async () => {
    const client = new InMemoryCoreClient();

    expect(await kvGet(client.asClient(), 'missing')).toBeUndefined();
  });

  it('returns the stored value for an existing key', async () => {
    const client = new InMemoryCoreClient();
    client.seed('k', { a: 1 });

    expect(await kvGet<{ a: number }>(client.asClient(), 'k')).toEqual({ a: 1 });
  });

  it('does not confuse different keys', async () => {
    const client = new InMemoryCoreClient();
    client.seed('a', 1);
    client.seed('b', 2);

    expect(await kvGet(client.asClient(), 'a')).toBe(1);
    expect(await kvGet(client.asClient(), 'b')).toBe(2);
  });
});

describe('kvSet', () => {
  it('creates a row on first write', async () => {
    const client = new InMemoryCoreClient();

    await kvSet(client.asClient(), 'k', { hello: 'world' });

    expect(client.rows.size).toBe(1);
    expect(await kvGet(client.asClient(), 'k')).toEqual({ hello: 'world' });
  });

  it('updates in place on subsequent writes without duplicating', async () => {
    const client = new InMemoryCoreClient();

    await kvSet(client.asClient(), 'k', { v: 1 });
    await kvSet(client.asClient(), 'k', { v: 2 });
    await kvSet(client.asClient(), 'k', { v: 3 });

    expect(client.rows.size).toBe(1);
    expect(await kvGet(client.asClient(), 'k')).toEqual({ v: 3 });
  });

  it('keeps the original row id across updates', async () => {
    const client = new InMemoryCoreClient();

    await kvSet(client.asClient(), 'k', 1);
    const firstId = client.rows.get('k')?.id;
    await kvSet(client.asClient(), 'k', 2);

    expect(client.rows.get('k')?.id).toBe(firstId);
  });

  it('stores arbitrary JSON-serializable payloads', async () => {
    const client = new InMemoryCoreClient();
    const payload = {
      nested: { list: [1, 2, 3], flag: true },
      label: 'x',
      count: 42,
    };

    await kvSet(client.asClient(), 'k', payload);

    expect(await kvGet(client.asClient(), 'k')).toEqual(payload);
  });

  it('recovers from a create race by updating the row the other writer created', async () => {
    const client = new InMemoryCoreClient();
    // Simulate a concurrent writer: a row already exists, but our first read
    // misses it (as if it were inserted just after we looked).
    client.seed('k', { winner: true });
    client.hideKeyOnce('k');

    await kvSet(client.asClient(), 'k', { winner: false });

    // No duplicate row, and the value reflects our write.
    expect(client.rows.size).toBe(1);
    expect(await kvGet(client.asClient(), 'k')).toEqual({ winner: false });
  });

  it('rethrows a create failure that is not a duplicate-key race', async () => {
    const client = new InMemoryCoreClient();
    client.failNextCreate = true;

    // The create fails and no competing row exists, so the error must surface.
    await expect(kvSet(client.asClient(), 'k', { v: 1 })).rejects.toThrow();
    expect(client.rows.size).toBe(0);
  });
});

describe('kvDel', () => {
  it('removes an existing key', async () => {
    const client = new InMemoryCoreClient();
    await kvSet(client.asClient(), 'k', 1);

    await kvDel(client.asClient(), 'k');

    expect(client.rows.size).toBe(0);
    expect(await kvGet(client.asClient(), 'k')).toBeUndefined();
  });

  it('is a no-op for a missing key', async () => {
    const client = new InMemoryCoreClient();

    await expect(kvDel(client.asClient(), 'missing')).resolves.toBeUndefined();
    expect(client.rows.size).toBe(0);
  });

  it('only removes the targeted key', async () => {
    const client = new InMemoryCoreClient();
    await kvSet(client.asClient(), 'a', 1);
    await kvSet(client.asClient(), 'b', 2);

    await kvDel(client.asClient(), 'a');

    expect(await kvGet(client.asClient(), 'a')).toBeUndefined();
    expect(await kvGet(client.asClient(), 'b')).toBe(2);
  });
});
