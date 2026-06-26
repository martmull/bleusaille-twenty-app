import type { CoreApiClient } from 'twenty-client-sdk/core';
import { isDefined } from 'twenty-sdk/utils';

/**
 * A durable, workspace-scoped key-value store backed by the `kvStore` custom
 * object (see src/objects/kv-store.object.ts). Logic functions run in
 * short-lived sandboxes, so anything that must survive between runs — cached
 * third-party responses, cursors, shared state — is persisted here.
 *
 * There is no built-in expiration: store a timestamp inside the value and check
 * it on read to implement a TTL (see the qualify-odds cache in odds.ts).
 */

const findByKey = async (client: CoreApiClient, key: string) => {
  const { kvStores } = await client.query({
    kvStores: {
      __args: { filter: { key: { eq: key } }, first: 1 },
      edges: { node: { id: true, value: true } },
    },
  });

  return kvStores.edges[0]?.node;
};

/** Reads a value. Returns undefined when the key is missing. */
export const kvGet = async <TValue>(
  client: CoreApiClient,
  key: string,
): Promise<TValue | undefined> => {
  const row = await findByKey(client, key);

  return isDefined(row) ? (row.value as TValue) : undefined;
};

/** Writes a value, creating the row on first write and updating it afterwards. */
export const kvSet = async (
  client: CoreApiClient,
  key: string,
  value: unknown,
): Promise<void> => {
  const existing = await findByKey(client, key);

  if (isDefined(existing)) {
    await client.mutation({
      updateKvStore: { __args: { id: existing.id, data: { value } }, id: true },
    });
    return;
  }

  try {
    await client.mutation({
      createKvStore: { __args: { data: { key, value } }, id: true },
    });
  } catch (error) {
    // The create can fail because another run inserted the same key between our
    // lookup and create (the unique index rejected the duplicate). If a row now
    // exists, that race is the cause — update it. Otherwise the failure was
    // something else (network, permission, ...) and must not be swallowed.
    const winner = await findByKey(client, key);
    if (!isDefined(winner)) {
      throw error;
    }
    await client.mutation({
      updateKvStore: { __args: { id: winner.id, data: { value } }, id: true },
    });
  }
};

/** Deletes a value. No-op when the key is missing. */
export const kvDel = async (client: CoreApiClient, key: string): Promise<void> => {
  const existing = await findByKey(client, key);

  if (isDefined(existing)) {
    await client.mutation({
      deleteKvStore: { __args: { id: existing.id }, id: true },
    });
  }
};
