import { CoreApiClient } from 'twenty-client-sdk/core';
import { afterAll, describe, expect, it } from 'vitest';

import { kvDel, kvGet, kvSet } from 'src/logic-functions/shared/kv-store';

const client = new CoreApiClient();

// Every test uses a fresh, unique key so runs never collide; they are cleaned
// up afterwards.
const createdKeys: string[] = [];
const uniqueKey = (name: string): string => {
  const key = `test:kv:${name}:${Date.now()}-${Math.random().toString(36).slice(2)}`;
  createdKeys.push(key);
  return key;
};

const countRows = async (key: string): Promise<number> => {
  const { kvStores } = await client.query({
    kvStores: {
      __args: { filter: { key: { eq: key } }, first: 10 },
      edges: { node: { id: true } },
    },
  });
  return kvStores.edges.length;
};

afterAll(async () => {
  await Promise.all(createdKeys.map((key) => kvDel(client, key).catch(() => {})));
});

describe('kv-store (integration)', () => {
  it('returns undefined for a missing key', async () => {
    expect(await kvGet(client, uniqueKey('missing'))).toBeUndefined();
  });

  it('writes then reads a value back', async () => {
    const key = uniqueKey('set-get');

    await kvSet(client, key, { rate: 1.5, fetchedAt: 123 });

    expect(await kvGet(client, key)).toEqual({ rate: 1.5, fetchedAt: 123 });
  });

  it('updates an existing key in place without creating a duplicate row', async () => {
    const key = uniqueKey('upsert');

    await kvSet(client, key, { v: 1 });
    await kvSet(client, key, { v: 2 });

    expect(await kvGet(client, key)).toEqual({ v: 2 });
    expect(await countRows(key)).toBe(1);
  });

  it('round-trips nested objects and arrays', async () => {
    const key = uniqueKey('json');
    const payload = { teamPrices: { canada: 1.25, southafrica: 3.75 }, tags: ['a', 'b'] };

    await kvSet(client, key, payload);

    expect(await kvGet(client, key)).toEqual(payload);
  });

  it('deletes a key', async () => {
    const key = uniqueKey('delete');
    await kvSet(client, key, { gone: false });

    await kvDel(client, key);

    expect(await kvGet(client, key)).toBeUndefined();
    expect(await countRows(key)).toBe(0);
  });

  it('treats deleting a missing key as a no-op', async () => {
    await expect(kvDel(client, uniqueKey('no-op'))).resolves.toBeUndefined();
  });
});
