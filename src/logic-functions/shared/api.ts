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

// Generic entity-keyed pager: fetches every page of `entity` with the given
// genql `node` selection (and optional args like filter/orderBy), removing the
// repeated first/after/pageInfo/edges plumbing at each call site. The caller
// pairs its own `TNode` type with the `node` selection, exactly as it did with
// the inline fetchAllPages calls.
export const fetchAllRecords = async <TNode>(
  client: CoreApiClient,
  entity: string,
  node: Record<string, unknown>,
  args: Record<string, unknown> = {},
): Promise<TNode[]> =>
  fetchAllPages<TNode>(async (after) => {
    const result = await client.query({
      [entity]: {
        __args: { first: PAGE_SIZE, after, ...args },
        edges: { node },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    } as never);
    return (result as Record<string, Connection<TNode>>)[entity];
  });

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

// A single mutation can update at most this many records (server-enforced).
export const MAX_RECORDS_PER_MUTATION = 200;

type MatchTriple = { home: number | null; draw: number | null; away: number | null };

type MatchTripleFields = {
  live: readonly [string, string, string];
  prematch: readonly [string, string, string];
};

// Shared scaffolding for the match quote/breakeven steps: recompute a
// home/draw/away triple per match, write it to the live fields, and mirror it
// onto the prematch fields while the match is still upcoming. Only matches whose
// live or prematch values actually change are returned, ready for
// applyGroupedUpdates.
export const buildMatchTripleUpdates = <R extends { id: string; startDate: string | null }>(
  matches: R[],
  fields: MatchTripleFields,
  compute: (match: R) => MatchTriple,
  now: number,
): Array<{ id: string; data: Record<string, number | null> }> => {
  const [liveHome, liveDraw, liveAway] = fields.live;
  const [preHome, preDraw, preAway] = fields.prematch;
  const updates: Array<{ id: string; data: Record<string, number | null> }> = [];

  for (const match of matches) {
    const { home, draw, away } = compute(match);
    const current = match as Record<string, unknown>;

    const liveChanged =
      current[liveHome] !== home || current[liveDraw] !== draw || current[liveAway] !== away;

    const isUpcoming = match.startDate ? new Date(match.startDate).getTime() > now : false;
    const prematchChanged =
      isUpcoming &&
      (current[preHome] !== home || current[preDraw] !== draw || current[preAway] !== away);

    if (!liveChanged && !prematchChanged) {
      continue;
    }

    updates.push({
      id: match.id,
      data: {
        [liveHome]: home,
        [liveDraw]: draw,
        [liveAway]: away,
        ...(isUpcoming ? { [preHome]: home, [preDraw]: draw, [preAway]: away } : {}),
      },
    });
  }

  return updates;
};

// Shared diff tail for the per-record "recompute one field, write only the rows
// that change" steps. targetOf returns undefined to skip a record entirely
// (e.g. people absent from a lookup map), distinct from null which is a written
// value. Returns the changed records ready for applyGroupedUpdates.
export const buildFieldUpdates = <TRecord extends { id: string }, TValue>(
  records: TRecord[],
  field: string,
  currentOf: (record: TRecord) => TValue | null,
  targetOf: (record: TRecord) => TValue | null | undefined,
): Array<{ id: string; data: Record<string, TValue | null> }> => {
  const updates: Array<{ id: string; data: Record<string, TValue | null> }> = [];

  for (const record of records) {
    const target = targetOf(record);
    if (target === undefined || currentOf(record) === target) {
      continue;
    }
    updates.push({ id: record.id, data: { [field]: target } });
  }

  return updates;
};

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

  // A group can hold more ids than a single mutation allows, so split each
  // group's ids into capped batches before issuing the updates.
  const batches = [...groups.values()].flatMap((group) =>
    chunk(group.ids, MAX_RECORDS_PER_MUTATION).map((ids) => ({ data: group.data, ids })),
  );

  for (const concurrentBatches of chunk(batches, MUTATION_CONCURRENCY)) {
    await Promise.all(concurrentBatches.map((batch) => updateMany(batch.ids, batch.data)));
  }

  return updates.length;
};
