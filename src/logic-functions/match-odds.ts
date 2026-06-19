import { defineLogicFunction, RoutePayload } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { getStageMultiplier } from 'src/logic-functions/shared/compute-puntos';
import { teamPairKey } from 'src/logic-functions/shared/team-aliases';
import { BetValue } from 'src/objects/bet.object';

type BetRecord = {
  betValue: string;
  ev: number | null;
  person: { id: string; name: { firstName: string | null } | null } | null;
  match: {
    home: string | null;
    away: string | null;
  } | null;
};

type MatchRecord = {
  home: string | null;
  away: string | null;
  stage: string | null;
  homeQuote: number | null;
  drawQuote: number | null;
  awayQuote: number | null;
  homeBreakeven: number | null;
  drawBreakeven: number | null;
  awayBreakeven: number | null;
};

type PersonRecord = {
  id: string;
  puntos: number | null;
  name: { firstName: string | null } | null;
};

type OutcomeUser = {
  name: string;
  newPuntos: number;
  newRank: number;
  rankDelta: number;
};

type OutcomeBets = {
  ev: number | null;
  payout: number;
  probability: number | null;
  quote: number | null;
  breakeven: number | null;
  users: OutcomeUser[];
};

type Outcomes = {
  home: OutcomeBets;
  draw: OutcomeBets;
  away: OutcomeBets;
};

type MatchOddsResponse = {
  found: boolean;
  outcomes?: Outcomes;
};

type RankTotals = Map<string, { firstName: string; total: number }>;

const computeRanks = (totals: RankTotals): Map<string, number> => {
  const sorted = [...totals.entries()].sort(
    (a, b) => b[1].total - a[1].total || a[1].firstName.localeCompare(b[1].firstName),
  );
  const ranks = new Map<string, number>();
  sorted.forEach(([id], index) => ranks.set(id, index + 1));
  return ranks;
};

const fetchOutcomes = async (home: string, away: string): Promise<Outcomes | undefined> => {
  const livePairKey = teamPairKey(home, away);

  const client = createCoreApiClient();

  const [matches, bets, people] = await Promise.all([
    fetchAllPages<MatchRecord>(async (after) => {
      const { matches: page } = await client.query({
        matches: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              home: true,
              away: true,
              stage: true,
              homeQuote: true,
              drawQuote: true,
              awayQuote: true,
              homeBreakeven: true,
              drawBreakeven: true,
              awayBreakeven: true,
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    fetchAllPages<BetRecord>(async (after) => {
      const { bets: page } = await client.query({
        bets: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              betValue: true,
              ev: true,
              person: { id: true, name: { firstName: true } },
              match: {
                home: true,
                away: true,
              },
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    fetchAllPages<PersonRecord>(async (after) => {
      const { people: page } = await client.query({
        people: {
          __args: { first: PAGE_SIZE, after },
          edges: { node: { id: true, puntos: true, name: { firstName: true } } },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const matchRecord = matches.find(
    (record) =>
      record.home &&
      record.away &&
      teamPairKey(record.home, record.away) === livePairKey,
  );

  const matchBets = bets.filter(
    (bet) =>
      bet.match?.home &&
      bet.match?.away &&
      teamPairKey(bet.match.home, bet.match.away) === livePairKey,
  );

  if (!matchRecord && matchBets.length === 0) {
    return undefined;
  }

  const stage = matchRecord?.stage ?? null;
  const pot = 10 * getStageMultiplier(stage) * matchBets.length;

  const inverseQuote = (quote: number | null | undefined): number =>
    quote && quote > 0 ? 1 / quote : 0;
  const inverseByOutcome: Record<BetValue, number> = {
    [BetValue.HOME_WIN]: inverseQuote(matchRecord?.homeQuote),
    [BetValue.NULL_OR_DRAW]: inverseQuote(matchRecord?.drawQuote),
    [BetValue.AWAY_WIN]: inverseQuote(matchRecord?.awayQuote),
  };
  const quoteByOutcome: Record<BetValue, number | null> = {
    [BetValue.HOME_WIN]: matchRecord?.homeQuote ?? null,
    [BetValue.NULL_OR_DRAW]: matchRecord?.drawQuote ?? null,
    [BetValue.AWAY_WIN]: matchRecord?.awayQuote ?? null,
  };
  const breakevenByOutcome: Record<BetValue, number | null> = {
    [BetValue.HOME_WIN]: matchRecord?.homeBreakeven ?? null,
    [BetValue.NULL_OR_DRAW]: matchRecord?.drawBreakeven ?? null,
    [BetValue.AWAY_WIN]: matchRecord?.awayBreakeven ?? null,
  };
  const totalInverse =
    inverseByOutcome[BetValue.HOME_WIN] +
    inverseByOutcome[BetValue.NULL_OR_DRAW] +
    inverseByOutcome[BetValue.AWAY_WIN];

  const baseTotals: RankTotals = new Map();
  for (const person of people) {
    const firstName = person.name?.firstName;
    if (!firstName) {
      continue;
    }
    baseTotals.set(person.id, { firstName, total: person.puntos ?? 0 });
  }
  const currentRanks = computeRanks(baseTotals);

  const buildOutcome = (betValue: BetValue): OutcomeBets => {
    const outcomeBets = matchBets.filter((bet) => bet.betValue === betValue);
    const ev = outcomeBets.find((bet) => bet.ev !== null)?.ev ?? null;
    const winners = outcomeBets.length;
    const payout = winners > 0 ? Math.round(pot / winners) : 0;
    const probability = totalInverse > 0 ? inverseByOutcome[betValue] / totalInverse : null;

    const scenarioTotals: RankTotals = new Map(
      [...baseTotals].map(([id, value]) => [id, { ...value }]),
    );
    for (const bet of outcomeBets) {
      const id = bet.person?.id;
      const entry = id ? scenarioTotals.get(id) : undefined;
      if (entry) {
        entry.total += payout;
      }
    }
    const scenarioRanks = computeRanks(scenarioTotals);

    const users = outcomeBets
      .map((bet): OutcomeUser | null => {
        const id = bet.person?.id;
        const name = bet.person?.name?.firstName;
        if (!id || !name) {
          return null;
        }
        const currentRank = currentRanks.get(id) ?? 0;
        const newRank = scenarioRanks.get(id) ?? currentRank;
        const newPuntos = (baseTotals.get(id)?.total ?? 0) + payout;
        return { name, newPuntos, newRank, rankDelta: currentRank - newRank };
      })
      .filter((user): user is OutcomeUser => user !== null)
      .sort((a, b) => b.newPuntos - a.newPuntos || a.name.localeCompare(b.name));

    return {
      ev,
      payout,
      probability,
      quote: quoteByOutcome[betValue],
      breakeven: breakevenByOutcome[betValue],
      users,
    };
  };

  return {
    home: buildOutcome(BetValue.HOME_WIN),
    draw: buildOutcome(BetValue.NULL_OR_DRAW),
    away: buildOutcome(BetValue.AWAY_WIN),
  };
};

const handler = async (event: RoutePayload): Promise<MatchOddsResponse> => {
  const home = event.queryStringParameters?.home;
  const away = event.queryStringParameters?.away;

  if (!home || !away) {
    return { found: false };
  }

  const outcomes = await fetchOutcomes(home, away);

  if (!outcomes) {
    return { found: false };
  }

  return { found: true, outcomes };
};

export default defineLogicFunction({
  universalIdentifier: 'b3f0c2d4-2a7e-4f1b-9c84-1d6e5a2f7c10',
  name: 'match-odds',
  description: 'Returns the bet outcomes (EV, payouts, rank scenarios) for a given match.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/match-odds',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
