import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { getStageMultiplier } from 'src/logic-functions/shared/compute-puntos';
import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';
import { teamPairKey } from 'src/logic-functions/shared/team-aliases';
import { BetValue } from 'src/objects/bet.object';

type FootballDataMatch = {
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
};

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

type LiveMatchState = 'LIVE' | 'HALF_TIME' | 'UPCOMING';

type LiveMatchResponse = {
  found: boolean;
  state?: LiveMatchState;
  home?: string;
  away?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  startDate?: string;
  stageLabel?: string;
  groupLabel?: string | null;
  outcomes?: Outcomes;
};

const IN_PROGRESS_STATUSES = new Set(['IN_PLAY', 'PAUSED']);
const UPCOMING_STATUSES = new Set(['TIMED', 'SCHEDULED']);

const MAX_MATCH_DURATION_MS = 3 * 60 * 60 * 1000;

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Phase de groupes',
  LAST_32: '16es de finale',
  LAST_16: '8es de finale',
  QUARTER_FINALS: 'Quarts de finale',
  SEMI_FINALS: 'Demi-finales',
  THIRD_PLACE: 'Petite finale',
  FINAL: 'Finale',
};

const toStageLabel = (stage: string): string => STAGE_LABELS[stage] ?? 'Coupe du Monde';

const toGroupLabel = (group: string | null): string | null => {
  if (!group || !group.startsWith('GROUP_')) {
    return null;
  }
  return `Groupe ${group.slice('GROUP_'.length)}`;
};

const byKickoffAsc =(a: FootballDataMatch, b: FootballDataMatch): number =>
  new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();

type RankTotals = Map<string, { firstName: string; total: number }>;

const computeRanks = (totals: RankTotals): Map<string, number> => {
  const sorted = [...totals.entries()].sort(
    (a, b) => b[1].total - a[1].total || a[1].firstName.localeCompare(b[1].firstName),
  );
  const ranks = new Map<string, number>();
  sorted.forEach(([id], index) => ranks.set(id, index + 1));
  return ranks;
};

const fetchOutcomes = async (match: FootballDataMatch): Promise<Outcomes | undefined> => {
  const livePairKey = teamPairKey(match.homeTeam.name!, match.awayTeam.name!);

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

const handler = async (): Promise<LiveMatchResponse> => {
  const matches = await fetchWorldCupMatches<FootballDataMatch>();

  const playable = matches.filter((match) => match.homeTeam.name && match.awayTeam.name);

  const now = Date.now();
  const kickoffMs = (match: FootballDataMatch): number => new Date(match.utcDate).getTime();

  const isLive = (match: FootballDataMatch): boolean =>
    IN_PROGRESS_STATUSES.has(match.status) ||
    (UPCOMING_STATUSES.has(match.status) &&
      kickoffMs(match) <= now &&
      now - kickoffMs(match) <= MAX_MATCH_DURATION_MS);

  const inProgress = playable.filter(isLive).sort(byKickoffAsc)[0];

  const upcoming = playable
    .filter((match) => UPCOMING_STATUSES.has(match.status) && kickoffMs(match) > now)
    .sort(byKickoffAsc)[0];

  const selected = inProgress ?? upcoming;

  if (!selected) {
    return { found: false };
  }

  const state: LiveMatchState = inProgress
    ? selected.status === 'PAUSED'
      ? 'HALF_TIME'
      : 'LIVE'
    : 'UPCOMING';

  const outcomes = await fetchOutcomes(selected);

  return {
    found: true,
    state,
    home: selected.homeTeam.name ?? '',
    away: selected.awayTeam.name ?? '',
    homeScore: state === 'UPCOMING' ? null : selected.score.fullTime.home,
    awayScore: state === 'UPCOMING' ? null : selected.score.fullTime.away,
    startDate: selected.utcDate,
    stageLabel: toStageLabel(selected.stage),
    groupLabel: toGroupLabel(selected.group),
    outcomes,
  };
};

export default defineLogicFunction({
  universalIdentifier: '79e1b7f5-9e11-4292-9975-6c3200145e88',
  name: 'live-match',
  description:
    'Returns the in-progress World Cup match (live score and status), or the next upcoming match.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/live-match',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
