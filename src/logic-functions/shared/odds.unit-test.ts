import { afterEach, describe, expect, it, vi } from 'vitest';

import { InMemoryCoreClient } from 'src/__tests__/in-memory-core-client';
import {
  type CachedQualify,
  fetchMatchQualifyChances,
} from 'src/logic-functions/shared/odds';
import { canonicalTeamName, teamPairKey } from 'src/logic-functions/shared/team-aliases';

type DrawNoBetEvent = {
  bookmakers: Array<{
    key: string;
    markets: Array<{ key: string; outcomes: Array<{ name: string; price: number }> }>;
  }>;
};

const SA_CANADA_ID = 'evt-sa-canada';
const BRAZIL_JAPAN_ID = 'evt-brazil-japan';

const EVENTS = [
  { id: SA_CANADA_ID, home_team: 'South Africa', away_team: 'Canada' },
  { id: BRAZIL_JAPAN_ID, home_team: 'Brazil', away_team: 'Japan' },
];

const drawNoBet = (
  outcomes: Array<{ name: string; price: number }>,
  key: string,
): { key: string; markets: Array<{ key: string; outcomes: typeof outcomes }> } => ({
  key,
  markets: [{ key: 'draw_no_bet', outcomes }],
});

// William Hill (preferred) and Pinnacle quote the South Africa vs Canada game.
const SA_CANADA_ODDS: DrawNoBetEvent = {
  bookmakers: [
    drawNoBet(
      [
        { name: 'Canada', price: 1.25 },
        { name: 'South Africa', price: 3.75 },
      ],
      'williamhill',
    ),
    drawNoBet(
      [
        { name: 'Canada', price: 1.27 },
        { name: 'South Africa', price: 3.99 },
      ],
      'pinnacle',
    ),
  ],
};

// Partially populated responses that exercise the `?? []` / strict-market paths.
const NO_BOOKMAKERS: DrawNoBetEvent = { bookmakers: [] };
const EMPTY_MARKETS: DrawNoBetEvent = { bookmakers: [{ key: 'williamhill', markets: [] }] };
const NO_DRAW_NO_BET_MARKET: DrawNoBetEvent = {
  bookmakers: [
    {
      key: 'williamhill',
      markets: [
        {
          key: 'h2h',
          outcomes: [
            { name: 'Canada', price: 1.2 },
            { name: 'South Africa', price: 4.0 },
          ],
        },
      ],
    },
  ],
};

const saCanadaPair = teamPairKey('South Africa', 'Canada');
const saKey = canonicalTeamName('South Africa');
const canadaKey = canonicalTeamName('Canada');
const cacheKey = (eventId: string) => `cache:qualify-cote:${eventId}`;

const stubFetch = (oddsById: Record<string, DrawNoBetEvent>) => {
  const fetchMock = vi.fn(async (url: string) => {
    if (url.includes('/events/') && url.includes('/odds/')) {
      const eventId = url.split('/events/')[1].split('/odds/')[0];
      const odds = oddsById[eventId];
      return odds
        ? { ok: true, json: async () => odds }
        : { ok: false, status: 404, json: async () => ({}) };
    }
    if (url.includes('/events')) {
      return { ok: true, json: async () => EVENTS };
    }
    return { ok: false, status: 404, json: async () => ({}) };
  });

  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const oddsRequestedFor = (fetchMock: ReturnType<typeof vi.fn>, eventId: string): boolean =>
  fetchMock.mock.calls.some(([url]) => String(url).includes(`/events/${eventId}/odds/`));

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('fetchMatchQualifyChances', () => {
  it('returns an empty map and makes no request when no pairs are requested', async () => {
    const fetchMock = stubFetch({ [SA_CANADA_ID]: SA_CANADA_ODDS });

    const result = await fetchMatchQualifyChances(new Set());

    expect(result.size).toBe(0);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('returns William Hill draw-no-bet prices keyed by canonical team name', async () => {
    stubFetch({ [SA_CANADA_ID]: SA_CANADA_ODDS });

    const result = await fetchMatchQualifyChances(new Set([saCanadaPair]));

    const chances = result.get(saCanadaPair);
    expect(chances?.teamPrices.get(saKey)).toBe(3.75);
    expect(chances?.teamPrices.get(canadaKey)).toBe(1.25);
    // No draw outcome exists in this market.
    expect(chances?.teamPrices.size).toBe(2);
  });

  it('falls back to the first bookmaker when William Hill is absent', async () => {
    stubFetch({
      [SA_CANADA_ID]: { bookmakers: [SA_CANADA_ODDS.bookmakers[1]] },
    });

    const result = await fetchMatchQualifyChances(new Set([saCanadaPair]));

    const chances = result.get(saCanadaPair);
    expect(chances?.teamPrices.get(saKey)).toBe(3.99);
    expect(chances?.teamPrices.get(canadaKey)).toBe(1.27);
  });

  it('only requests odds for the pairs asked for', async () => {
    const fetchMock = stubFetch({
      [SA_CANADA_ID]: SA_CANADA_ODDS,
      [BRAZIL_JAPAN_ID]: SA_CANADA_ODDS,
    });

    const result = await fetchMatchQualifyChances(new Set([saCanadaPair]));

    expect(result.has(saCanadaPair)).toBe(true);
    expect(result.has(teamPairKey('Brazil', 'Japan'))).toBe(false);
    expect(oddsRequestedFor(fetchMock, SA_CANADA_ID)).toBe(true);
    expect(oddsRequestedFor(fetchMock, BRAZIL_JAPAN_ID)).toBe(false);
  });

  it('skips an event whose odds request fails', async () => {
    stubFetch({}); // events list resolves, but no odds available

    const result = await fetchMatchQualifyChances(new Set([saCanadaPair]));

    expect(result.size).toBe(0);
  });

  it('throws when the events listing response is not ok', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 401, json: async () => ({}) })),
    );

    await expect(fetchMatchQualifyChances(new Set([saCanadaPair]))).rejects.toThrow(
      /Events API request failed/,
    );
  });

  it.each([
    ['no bookmakers', NO_BOOKMAKERS],
    ['a bookmaker with no markets', EMPTY_MARKETS],
    ['no draw_no_bet market', NO_DRAW_NO_BET_MARKET],
  ])('adds no entry when the odds response has %s', async (_label, odds) => {
    stubFetch({ [SA_CANADA_ID]: odds });

    const result = await fetchMatchQualifyChances(new Set([saCanadaPair]));

    expect(result.size).toBe(0);
  });

  it('does not write to the cache when no qualify odds are found', async () => {
    const client = new InMemoryCoreClient();
    stubFetch({ [SA_CANADA_ID]: NO_BOOKMAKERS });

    await fetchMatchQualifyChances(new Set([saCanadaPair]), client.asClient());

    expect(client.rows.has(cacheKey(SA_CANADA_ID))).toBe(false);
  });

  it('caches the fetched odds in the KV store with a fetched-at timestamp', async () => {
    const client = new InMemoryCoreClient();
    stubFetch({ [SA_CANADA_ID]: SA_CANADA_ODDS });

    await fetchMatchQualifyChances(new Set([saCanadaPair]), client.asClient());

    const cached = client.rows.get(cacheKey(SA_CANADA_ID))?.value as CachedQualify | undefined;
    expect(cached?.teamPrices).toEqual({ [saKey]: 3.75, [canadaKey]: 1.25 });
    expect(typeof cached?.fetchedAt).toBe('number');
  });

  it('serves fresh cached odds without calling the paid odds endpoint', async () => {
    const client = new InMemoryCoreClient();
    client.seed(cacheKey(SA_CANADA_ID), {
      teamPrices: { [saKey]: 9.99, [canadaKey]: 1.11 },
      fetchedAt: Date.now(),
    });
    const fetchMock = stubFetch({ [SA_CANADA_ID]: SA_CANADA_ODDS });

    const result = await fetchMatchQualifyChances(new Set([saCanadaPair]), client.asClient());

    // Value comes from the cache, not the (distinct) live odds.
    expect(result.get(saCanadaPair)?.teamPrices.get(saKey)).toBe(9.99);
    expect(oddsRequestedFor(fetchMock, SA_CANADA_ID)).toBe(false);
    // The (free) events listing is still fetched.
    expect(fetchMock).toHaveBeenCalled();
  });

  it('refetches and overwrites the cache when the cached odds are stale', async () => {
    const client = new InMemoryCoreClient();
    const twoHoursMs = 2 * 60 * 60 * 1000;
    client.seed(cacheKey(SA_CANADA_ID), {
      teamPrices: { [saKey]: 9.99, [canadaKey]: 1.11 },
      fetchedAt: Date.now() - twoHoursMs,
    });
    const fetchMock = stubFetch({ [SA_CANADA_ID]: SA_CANADA_ODDS });

    const result = await fetchMatchQualifyChances(new Set([saCanadaPair]), client.asClient());

    expect(result.get(saCanadaPair)?.teamPrices.get(saKey)).toBe(3.75);
    expect(oddsRequestedFor(fetchMock, SA_CANADA_ID)).toBe(true);

    const cached = client.rows.get(cacheKey(SA_CANADA_ID))?.value as CachedQualify | undefined;
    expect(cached?.teamPrices[saKey]).toBe(3.75);
  });
});
