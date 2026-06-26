import type { CoreApiClient } from 'twenty-client-sdk/core';

/**
 * Minimal in-memory stand-in for {@link CoreApiClient} covering only the
 * `kvStore` query/mutations used by the key-value store helpers. Lets the KV
 * helpers (and the qualify-odds cache) be unit-tested without a live Twenty
 * instance. Enforces key uniqueness like the real unique index.
 */
type Row = { id: string; key: string; value: unknown };

export class InMemoryCoreClient {
  readonly rows = new Map<string, Row>();
  private sequence = 0;
  private readonly hiddenOnce = new Set<string>();

  /** Make the next createKvStore throw, to simulate a non-duplicate failure. */
  failNextCreate = false;

  /**
   * Make the very next read of `key` miss, to simulate a concurrent writer that
   * inserted the row between our lookup and our create (the uniqueness race the
   * KV helper guards against).
   */
  hideKeyOnce(key: string): void {
    this.hiddenOnce.add(key);
  }

  /** Pre-seed a row directly (bypassing uniqueness), e.g. to prime a cache. */
  seed(key: string, value: unknown): void {
    this.rows.set(key, { id: `row-${++this.sequence}`, key, value });
  }

  async query(operation: any): Promise<any> {
    if (operation.kvStores) {
      const key = operation.kvStores.__args.filter.key.eq as string;

      if (this.hiddenOnce.has(key)) {
        this.hiddenOnce.delete(key);
        return { kvStores: { edges: [] } };
      }

      const row = this.rows.get(key);
      return {
        kvStores: { edges: row ? [{ node: { id: row.id, value: row.value } }] : [] },
      };
    }

    throw new Error(`Unexpected query: ${JSON.stringify(operation)}`);
  }

  async mutation(operation: any): Promise<any> {
    if (operation.createKvStore) {
      const { key, value } = operation.createKvStore.__args.data as {
        key: string;
        value: unknown;
      };

      if (this.failNextCreate) {
        this.failNextCreate = false;
        throw new Error('Simulated create failure (network/permission)');
      }

      if (this.rows.has(key)) {
        throw new Error(`Duplicate key "${key}" rejected by unique index`);
      }

      const id = `row-${++this.sequence}`;
      this.rows.set(key, { id, key, value });
      return { createKvStore: { id } };
    }

    if (operation.updateKvStore) {
      const { id, data } = operation.updateKvStore.__args as {
        id: string;
        data: { value: unknown };
      };
      const row = [...this.rows.values()].find((candidate) => candidate.id === id);
      if (row) {
        row.value = data.value;
      }
      return { updateKvStore: { id } };
    }

    if (operation.deleteKvStore) {
      const { id } = operation.deleteKvStore.__args as { id: string };
      const entry = [...this.rows.entries()].find(([, candidate]) => candidate.id === id);
      if (entry) {
        this.rows.delete(entry[0]);
      }
      return { deleteKvStore: { id } };
    }

    throw new Error(`Unexpected mutation: ${JSON.stringify(operation)}`);
  }

  /** Cast to the real client type for injection into helpers under test. */
  asClient(): CoreApiClient {
    return this as unknown as CoreApiClient;
  }
}
