import type { CoreApiClient } from 'twenty-client-sdk/core';

import { kvGet, kvSet } from 'src/logic-functions/shared/kv-store';
import { notifyOddsApiKeyExpired } from 'src/logic-functions/shared/resend';
import { canonicalTeamName, teamPairKey } from 'src/logic-functions/shared/team-aliases';

const ODDS_API_KEY = process.env.ODDS_API_KEY ?? '';
const ODDS_API_URL =
  'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup_winner/odds/' +
  `?apiKey=${ODDS_API_KEY}&regions=eu&markets=outrights&oddsFormat=decimal`;
const MATCH_ODDS_API_URL =
  'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/' +
  `?apiKey=${ODDS_API_KEY}&regions=eu&markets=h2h&oddsFormat=decimal`;
const EVENTS_API_URL =
  `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/events?apiKey=${ODDS_API_KEY}`;
const eventDrawNoBetUrl = (eventId: string): string =>
  `https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/events/${eventId}/odds/` +
  `?apiKey=${ODDS_API_KEY}&regions=eu&markets=draw_no_bet&oddsFormat=decimal`;

// Preferred bookmaker (Betfair Exchange); falls back to the first available one.
const PREFERRED_BOOKMAKER = 'betfair_ex_eu';
// Bookmaker used for the knockout draw-no-bet (qualify) market.
const DRAW_NO_BET_BOOKMAKER = 'williamhill';
const DRAW_NO_BET_MARKET = 'draw_no_bet';
// Each draw-no-bet event-odds request is billed by the-odds-api, so the result
// is cached in the workspace KV store and reused for this long between runs.
// (The events listing itself is free, so it is fetched fresh every run.)
const QUALIFY_CACHE_TTL_MS = 60 * 60 * 1000;
const qualifyCacheKey = (eventId: string): string => `cache:qualify-cote:${eventId}`;
type CachedQualify = { teamPrices: Record<string, number>; fetchedAt: number };

type Outcome = { name: string; price: number };
type Market = { key: string; outcomes: Outcome[] };
type Bookmaker = { key: string; markets: Market[] };
type OddsEvent = { bookmakers: Bookmaker[] };
type MatchOddsEvent = OddsEvent & { home_team: string; away_team: string };
type EventSummary = { id: string; home_team: string; away_team: string };

const DRAW_OUTCOME_NAME = 'draw';

/**
 * Fetches the live World Cup outright-winner odds from the-odds-api (Betfair
 * Exchange when available) and returns each team's implied probability (%),
 * keyed by lower-cased team name.
 */
export const fetchWorldCupWinnerChances = async (): Promise<Map<string, number>> => {
  const response = await fetch(ODDS_API_URL);

  if (!response.ok) {
    await notifyOddsApiKeyExpired({ url: ODDS_API_URL, status: response.status });
    throw new Error(`Odds API request failed: ${response.status}`);
  }

  const events = (await response.json()) as OddsEvent[];
  const bookmakers = events[0]?.bookmakers ?? [];
  const bookmaker =
    bookmakers.find((candidate) => candidate.key === PREFERRED_BOOKMAKER) ?? bookmakers[0];

  const outcomes = bookmaker?.markets[0]?.outcomes ?? [];

  const chances = new Map<string, number>();
  for (const outcome of outcomes) {
    if (outcome.price > 0) {
      chances.set(outcome.name.trim().toLowerCase(), Math.round((100 / outcome.price) * 10) / 10);
    }
  }

  return chances;
};

export type MatchResultChances = {
  drawProbability: number;
  teamProbabilities: Map<string, number>;
  drawPrice: number;
  teamPrices: Map<string, number>;
};


/**
 * Fetches the live home/draw/away (h2h) match odds and returns, per match
 * (keyed by the unordered canonical team pair), the margin-normalised implied
 * probability of a draw and of each team winning (keyed by canonical name).
 */
export const fetchMatchResultChances = async (): Promise<Map<string, MatchResultChances>> => {
  try {

  const response = await fetch(MATCH_ODDS_API_URL);

  if (!response.ok) {
    await notifyOddsApiKeyExpired({ url: MATCH_ODDS_API_URL, status: response.status });
    throw new Error(`Match odds API request failed: ${response.status}`);
  }

  const events = (await response.json()) as MatchOddsEvent[];

  const byPair = new Map<string, MatchResultChances>();

  for (const event of events) {
    const bookmakers = event.bookmakers ?? [];
    const bookmaker =
      bookmakers.find((candidate) => candidate.key === PREFERRED_BOOKMAKER) ?? bookmakers[0];
    const market = bookmaker?.markets.find((entry) => entry.key === 'h2h') ?? bookmaker?.markets[0];
    const outcomes = market?.outcomes ?? [];

    const inverses = outcomes.map((outcome) => (outcome.price > 0 ? 1 / outcome.price : 0));
    const total = inverses.reduce((sum, value) => sum + value, 0);

    if (total === 0) {
      continue;
    }

    let drawProbability = 0;
    let drawPrice = 0;
    const teamProbabilities = new Map<string, number>();
    const teamPrices = new Map<string, number>();

    outcomes.forEach((outcome, index) => {
      const probability = inverses[index] / total;
      if (outcome.name.trim().toLowerCase() === DRAW_OUTCOME_NAME) {
        drawProbability = probability;
        drawPrice = outcome.price;
      } else {
        teamProbabilities.set(canonicalTeamName(outcome.name), probability);
        teamPrices.set(canonicalTeamName(outcome.name), outcome.price);
      }
    });

    byPair.set(teamPairKey(event.home_team, event.away_team), {
      drawProbability,
      teamProbabilities,
      drawPrice,
      teamPrices,
    });
  }

  return byPair;
  }
  catch (error) {
    console.error('Error fetching match odds:', error);
    await notifyOddsApiKeyExpired({ url: ODDS_API_URL, status: 500 });
    throw error;
  }
};

export type MatchQualifyChances = {
  /** Decimal draw-no-bet (qualify) price per team, keyed by canonical name. */
  teamPrices: Map<string, number>;
};

/**
 * Fetches the knockout "qualify" odds (the-odds-api `draw_no_bet` market, which
 * has no draw outcome — only HOME and AWAY) for the given match pairs. Each
 * match requires its own event-odds request, so we first list the events to
 * resolve their ids, then only query the pairs we were asked about. Prices come
 * from William Hill when available, otherwise the first listed bookmaker.
 *
 * When a `client` is provided, each event's billed odds request is cached in
 * the workspace KV store for `QUALIFY_CACHE_TTL_MS`, so repeated runs reuse the
 * result instead of paying for it again.
 */
export const fetchMatchQualifyChances = async (
  pairKeys: Set<string>,
  client?: CoreApiClient,
): Promise<Map<string, MatchQualifyChances>> => {
  const byPair = new Map<string, MatchQualifyChances>();

  if (pairKeys.size === 0) {
    return byPair;
  }

  const response = await fetch(EVENTS_API_URL);

  if (!response.ok) {
    await notifyOddsApiKeyExpired({ url: EVENTS_API_URL, status: response.status });
    throw new Error(`Events API request failed: ${response.status}`);
  }

  const events = (await response.json()) as EventSummary[];
  const targets = events.filter((event) =>
    pairKeys.has(teamPairKey(event.home_team, event.away_team)),
  );

  const now = Date.now();

  await Promise.all(
    targets.map(async (event) => {
      const pairKey = teamPairKey(event.home_team, event.away_team);
      const cacheKey = qualifyCacheKey(event.id);

      // Serve from the KV cache while the stored odds are still fresh.
      if (client) {
        const cached = await kvGet<CachedQualify>(client, cacheKey);
        if (cached && now - cached.fetchedAt < QUALIFY_CACHE_TTL_MS) {
          byPair.set(pairKey, { teamPrices: new Map(Object.entries(cached.teamPrices)) });
          return;
        }
      }

      const oddsResponse = await fetch(eventDrawNoBetUrl(event.id));

      if (!oddsResponse.ok) {
        return;
      }

      const data = (await oddsResponse.json()) as OddsEvent;
      const bookmakers = data.bookmakers ?? [];
      const bookmaker =
        bookmakers.find((candidate) => candidate.key === DRAW_NO_BET_BOOKMAKER) ?? bookmakers[0];
      const market =
        bookmaker?.markets.find((entry) => entry.key === DRAW_NO_BET_MARKET) ?? bookmaker?.markets[0];
      const outcomes = market?.outcomes ?? [];

      const teamPrices: Record<string, number> = {};
      for (const outcome of outcomes) {
        if (outcome.price > 0) {
          teamPrices[canonicalTeamName(outcome.name)] = outcome.price;
        }
      }

      if (Object.keys(teamPrices).length > 0) {
        byPair.set(pairKey, { teamPrices: new Map(Object.entries(teamPrices)) });

        if (client) {
          await kvSet(client, cacheKey, { teamPrices, fetchedAt: now } satisfies CachedQualify);
        }
      }
    }),
  );

  return byPair;
};
