import { defineLogicFunction, RoutePayload } from 'twenty-sdk/define';

import { PUNTOS_SHARED_PER_MATCH } from 'src/constants/tournament';
import { createCoreApiClient, fetchAllRecords } from 'src/logic-functions/shared/api';
import { getStageMultiplier } from 'src/logic-functions/shared/compute-puntos';
import { cloneTotals, computeRanks, RankTotals } from 'src/logic-functions/shared/leaderboard';
import { canonicalTeamName, teamPairKey } from 'src/logic-functions/shared/team-aliases';
import { computeWinnerBetPot } from 'src/logic-functions/shared/winner-bet-puntos-ev';
import { BetValue } from 'src/objects/bet.object';
import { MatchType } from 'src/objects/match.object';

type BetRecord = {
  betValue: string;
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
  wcWinnerBet: string | null;
};

type WinnerBetPayout = { personId: string; amount: number };

type OutcomeUser = {
  name: string;
  newPuntos: number;
  newRank: number;
  rankDelta: number;
  wcw: boolean;
};

type OutcomeBets = {
  payout: number;
  expectedPuntos: number | null;
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

type LeaderboardEntry = {
  name: string;
  newPuntos: number;
  newRank: number;
  rankDelta: number;
};

type MatchOddsResponse = {
  found: boolean;
  outcomes?: Outcomes;
  provisionalLeaderboard?: LeaderboardEntry[];
};

const outcomeFromScore = (homeScore: number, awayScore: number): BetValue =>
  homeScore > awayScore
    ? BetValue.HOME_WIN
    : homeScore < awayScore
      ? BetValue.AWAY_WIN
      : BetValue.NULL_OR_DRAW;

const computeWinnerBetPayouts = (
  people: PersonRecord[],
  winningTeam: string | null,
): WinnerBetPayout[] => {
  if (!winningTeam) {
    return [];
  }
  const teamKey = canonicalTeamName(winningTeam);
  const pickers = people.filter(
    (person) => person.wcWinnerBet && canonicalTeamName(person.wcWinnerBet) === teamKey,
  );
  const pot = computeWinnerBetPot({ predictorsForTeam: pickers.length });
  if (pot === null) {
    return [];
  }
  const amount = Math.round(pot);
  return pickers.map((person) => ({ personId: person.id, amount }));
};

const buildLeaderboard = (
  winningOutcome: BetValue,
  baseTotals: RankTotals,
  currentRanks: Map<string, number>,
  matchBets: BetRecord[],
  pot: number,
  winnerBetPayouts: WinnerBetPayout[],
): LeaderboardEntry[] => {
  const winnerBets = matchBets.filter((bet) => bet.betValue === winningOutcome);
  const payout = winnerBets.length > 0 ? Math.round(pot / winnerBets.length) : 0;

  const scenarioTotals = cloneTotals(baseTotals);
  for (const bet of winnerBets) {
    const id = bet.person?.id;
    const entry = id ? scenarioTotals.get(id) : undefined;
    if (entry) {
      entry.total += payout;
    }
  }
  for (const { personId, amount } of winnerBetPayouts) {
    const entry = scenarioTotals.get(personId);
    if (entry) {
      entry.total += amount;
    }
  }
  const scenarioRanks = computeRanks(scenarioTotals);

  return [...scenarioTotals.entries()]
    .map(([id, value]): LeaderboardEntry => {
      const currentRank = currentRanks.get(id) ?? 0;
      const newRank = scenarioRanks.get(id) ?? currentRank;
      return {
        name: value.firstName,
        newPuntos: value.total,
        newRank,
        rankDelta: currentRank - newRank,
      };
    })
    .sort((a, b) => a.newRank - b.newRank);
};

const fetchOutcomes = async (
  home: string,
  away: string,
  homeScore: number | null,
  awayScore: number | null,
): Promise<{ outcomes: Outcomes; provisionalLeaderboard?: LeaderboardEntry[] } | undefined> => {
  const livePairKey = teamPairKey(home, away);

  const client = createCoreApiClient();

  const [matches, bets, people] = await Promise.all([
    fetchAllRecords<MatchRecord>(client, 'matches', {
      home: true,
      away: true,
      stage: true,
      homeQuote: true,
      drawQuote: true,
      awayQuote: true,
      homeBreakeven: true,
      drawBreakeven: true,
      awayBreakeven: true,
    }),
    fetchAllRecords<BetRecord>(client, 'bets', {
      betValue: true,
      person: { id: true, name: { firstName: true } },
      match: {
        home: true,
        away: true,
      },
    }),
    fetchAllRecords<PersonRecord>(client, 'people', {
      id: true,
      puntos: true,
      name: { firstName: true },
      wcWinnerBet: true,
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
  const pot = PUNTOS_SHARED_PER_MATCH * getStageMultiplier(stage);

  const isFinal = stage === MatchType.FINAL;
  const winnerBetPayoutsByOutcome: Record<BetValue, WinnerBetPayout[]> = {
    [BetValue.HOME_WIN]: isFinal
      ? computeWinnerBetPayouts(people, matchRecord?.home ?? home)
      : [],
    [BetValue.NULL_OR_DRAW]: [],
    [BetValue.AWAY_WIN]: isFinal
      ? computeWinnerBetPayouts(people, matchRecord?.away ?? away)
      : [],
  };

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
    const winners = outcomeBets.length;
    const payout = winners > 0 ? Math.round(pot / winners) : 0;
    const probability = totalInverse > 0 ? inverseByOutcome[betValue] / totalInverse : null;
    // Expected puntos a bettor on this outcome wins: the payout they'd get if it
    // happens, weighted by the live implied probability of it happening.
    const expectedPuntos = probability !== null ? payout * probability : null;

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
    for (const { personId, amount } of winnerBetPayoutsByOutcome[betValue]) {
      const entry = scenarioTotals.get(personId);
      if (entry) {
        entry.total += amount;
      }
    }
    const scenarioRanks = computeRanks(scenarioTotals);

    const wcwUserIds = new Set(
      winnerBetPayoutsByOutcome[betValue].map(({ personId }) => personId),
    );

    const scenarioUserIds = new Set<string>();
    for (const bet of outcomeBets) {
      if (bet.person?.id) {
        scenarioUserIds.add(bet.person.id);
      }
    }
    for (const personId of wcwUserIds) {
      scenarioUserIds.add(personId);
    }

    const users = [...scenarioUserIds]
      .map((id): OutcomeUser | null => {
        const entry = scenarioTotals.get(id);
        if (!entry) {
          return null;
        }
        const currentRank = currentRanks.get(id) ?? 0;
        const newRank = scenarioRanks.get(id) ?? currentRank;
        return {
          name: entry.firstName,
          newPuntos: entry.total,
          newRank,
          rankDelta: currentRank - newRank,
          wcw: wcwUserIds.has(id),
        };
      })
      .filter((user): user is OutcomeUser => user !== null)
      .sort((a, b) => b.newPuntos - a.newPuntos || a.name.localeCompare(b.name));

    return {
      payout,
      expectedPuntos,
      probability,
      quote: quoteByOutcome[betValue],
      breakeven: breakevenByOutcome[betValue],
      users,
    };
  };

  const outcomes: Outcomes = {
    home: buildOutcome(BetValue.HOME_WIN),
    draw: buildOutcome(BetValue.NULL_OR_DRAW),
    away: buildOutcome(BetValue.AWAY_WIN),
  };

  const provisionalLeaderboard =
    homeScore !== null && awayScore !== null
      ? buildLeaderboard(
          outcomeFromScore(homeScore, awayScore),
          baseTotals,
          currentRanks,
          matchBets,
          pot,
          winnerBetPayoutsByOutcome[outcomeFromScore(homeScore, awayScore)],
        )
      : undefined;

  return { outcomes, provisionalLeaderboard };
};

const parseScore = (value: string | undefined): number | null => {
  if (!value) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const handler = async (event: RoutePayload): Promise<MatchOddsResponse> => {
  const home = event.queryStringParameters?.home;
  const away = event.queryStringParameters?.away;

  if (!home || !away) {
    return { found: false };
  }

  const result = await fetchOutcomes(
    home,
    away,
    parseScore(event.queryStringParameters?.homeScore),
    parseScore(event.queryStringParameters?.awayScore),
  );

  if (!result) {
    return { found: false };
  }

  return {
    found: true,
    outcomes: result.outcomes,
    provisionalLeaderboard: result.provisionalLeaderboard,
  };
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
