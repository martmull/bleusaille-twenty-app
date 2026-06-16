import { CoreApiClient } from 'twenty-client-sdk/core';

export const PAGE_SIZE = 60;

export const createCoreApiClient = () => new CoreApiClient();

type Edge<T> = { node: T };
type Connection<T> = {
  edges: Edge<T>[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

export const fetchAllPages = async <T>(
  fetchPage: (after: string | undefined) => Promise<Connection<T>>,
): Promise<T[]> => {
  const records: T[] = [];
  let after: string | undefined = undefined;

  while (true) {
    const connection = await fetchPage(after);
    records.push(...connection.edges.map((edge) => edge.node));

    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) {
      return records;
    }

    after = connection.pageInfo.endCursor;
  }
};

export const chunk = <T>(items: T[], size: number): T[][] => {
  const chunks: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
};

export const normalizeTeamName = (teamName: string): string =>
  teamName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const MUTATION_CONCURRENCY = 25;

type RecordUpdate<Data> = { id: string; data: Data };

export const applyGroupedUpdates = async <Data>(
  updates: RecordUpdate<Data>[],
  updateMany: (ids: string[], data: Data) => Promise<unknown>,
): Promise<number> => {
  const groups = new Map<string, { data: Data; ids: string[] }>();

  for (const { id, data } of updates) {
    const key = JSON.stringify(data);
    const group = groups.get(key);
    if (group) {
      group.ids.push(id);
    } else {
      groups.set(key, { data, ids: [id] });
    }
  }

  for (const batch of chunk([...groups.values()], MUTATION_CONCURRENCY)) {
    await Promise.all(batch.map((group) => updateMany(group.ids, group.data)));
  }

  return updates.length;
};
