import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { cloneTotals, computeRanks, RankTotals } from 'src/logic-functions/shared/leaderboard';

type MatchRecord = {
  id: string;
  home: string | null;
  away: string | null;
  score: string | null;
  endDate: string | null;
  result: string | null;
};

type WinningBetRecord = {
  puntos: number | null;
  person: { id: string | null; name: { firstName: string | null } | null } | null;
  match: { id: string | null } | null;
};

type PersonRecord = {
  id: string;
  name: { firstName: string | null } | null;
};

type Winner = {
  name: string;
  totalPuntos: number;
  newRank: number;
  rankDelta: number;
};

type FinishedMatch = {
  home: string;
  away: string;
  score: string;
  endDate: string | null;
  puntos: number;
  winners: Winner[];
};

const handler = async (): Promise<{ matches: FinishedMatch[] }> => {
  const client = createCoreApiClient();

  const [matches, winningBets, people] = await Promise.all([
    fetchAllPages<MatchRecord>(async (after) => {
      const { matches: page } = await client.query({
        matches: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              home: true,
              away: true,
              score: true,
              endDate: true,
              result: true,
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    fetchAllPages<WinningBetRecord>(async (after) => {
      const { bets: page } = await client.query({
        bets: {
          __args: { first: PAGE_SIZE, after, filter: { won: { eq: true } } },
          edges: {
            node: {
              puntos: true,
              person: { id: true, name: { firstName: true } },
              match: { id: true },
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
          edges: { node: { id: true, name: { firstName: true } } },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  type RawWinner = { name: string; personId: string; matchPuntos: number };

  const winnersByMatch = new Map<string, { winners: RawWinner[]; puntos: number }>();
  for (const bet of winningBets) {
    const matchId = bet.match?.id;
    const name = bet.person?.name?.firstName;
    const personId = bet.person?.id;
    if (!matchId || !name || !personId) {
      continue;
    }
    const entry = winnersByMatch.get(matchId) ?? { winners: [], puntos: 0 };
    entry.winners.push({
      name,
      personId,
      matchPuntos: bet.puntos ?? 0,
    });
    entry.puntos = Math.max(entry.puntos, bet.puntos ?? 0);
    winnersByMatch.set(matchId, entry);
  }

  const firstNameById = new Map<string, string>();
  for (const person of people) {
    const firstName = person.name?.firstName;
    if (person.id && firstName) {
      firstNameById.set(person.id, firstName);
    }
  }

  const matchEndMsById = new Map<string, number>();
  for (const match of matches) {
    if (match.id) {
      matchEndMsById.set(match.id, new Date(match.endDate ?? 0).getTime());
    }
  }

  const totalsByCutoff = new Map<number, RankTotals>();
  const totalsUpTo = (cutoffMs: number): RankTotals => {
    const cached = totalsByCutoff.get(cutoffMs);
    if (cached) {
      return cached;
    }
    const totals: RankTotals = new Map();
    for (const [id, firstName] of firstNameById) {
      totals.set(id, { firstName, total: 0 });
    }
    for (const [matchId, entry] of winnersByMatch) {
      const endMs = matchEndMsById.get(matchId);
      if (endMs === undefined || endMs > cutoffMs) {
        continue;
      }
      for (const winner of entry.winners) {
        const total = totals.get(winner.personId);
        if (total) {
          total.total += winner.matchPuntos;
        } else {
          totals.set(winner.personId, { firstName: winner.name, total: winner.matchPuntos });
        }
      }
    }
    totalsByCutoff.set(cutoffMs, totals);
    return totals;
  };

  const finished = matches
    .filter((match) => match.result && match.home && match.away)
    .sort(
      (a, b) =>
        new Date(b.endDate ?? 0).getTime() - new Date(a.endDate ?? 0).getTime(),
    )
    .map((match): FinishedMatch => {
      const entry = winnersByMatch.get(match.id);
      const rawWinners = entry?.winners ?? [];

      let winners: Winner[] = [];
      if (rawWinners.length > 0) {
        const cutoffMs = matchEndMsById.get(match.id) ?? new Date(match.endDate ?? 0).getTime();
        const afterTotals = totalsUpTo(cutoffMs);
        const afterRanks = computeRanks(afterTotals);

        const beforeTotals = cloneTotals(afterTotals);
        for (const winner of rawWinners) {
          const total = beforeTotals.get(winner.personId);
          if (total) {
            total.total -= winner.matchPuntos;
          }
        }
        const beforeRanks = computeRanks(beforeTotals);

        winners = rawWinners
          .map((winner): Winner => {
            const newRank = afterRanks.get(winner.personId) ?? 0;
            const beforeRank = beforeRanks.get(winner.personId) ?? newRank;
            return {
              name: winner.name,
              totalPuntos: afterTotals.get(winner.personId)?.total ?? 0,
              newRank,
              rankDelta: beforeRank - newRank,
            };
          })
          .sort((a, b) => a.name.localeCompare(b.name));
      }

      return {
        home: match.home as string,
        away: match.away as string,
        score: match.score ?? '',
        endDate: match.endDate,
        puntos: entry?.puntos ?? 0,
        winners,
      };
    });

  return { matches: finished };
};

export default defineLogicFunction({
  universalIdentifier: '61c480b2-b160-4581-bef1-4eee6d2af33a',
  name: 'finished-matches',
  description:
    'Returns finished matches (newest first by end date) with their final score, the puntos won, and the names of the winning bettors.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/finished-matches',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
