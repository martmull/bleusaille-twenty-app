import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';

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
  person: { id: string | null; name: { firstName: string | null } | null; puntos: number | null } | null;
  match: { id: string | null } | null;
};

type EvolutionRecord = {
  matchEndDate: string | null;
  points: number | null;
  person: { id: string | null } | null;
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

type RankTotals = Map<string, { firstName: string; total: number }>;

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

  const [matches, winningBets, evolutions, people] = await Promise.all([
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
              person: { id: true, name: { firstName: true }, puntos: true },
              match: { id: true },
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    fetchAllPages<EvolutionRecord>(async (after) => {
      const { puntosEvolutions: page } = await client.query({
        puntosEvolutions: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              matchEndDate: true,
              points: true,
              person: { id: true },
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

  type RawWinner = { name: string; totalPuntos: number; personId: string };

  const winnersByMatch = new Map<string, { winners: RawWinner[]; puntos: number }>();
  for (const bet of winningBets) {
    const matchId = bet.match?.id;
    const name = bet.person?.name?.firstName;
    const personId = bet.person?.id;
    if (!matchId || !name || !personId) {
      continue;
    }
    const entry = winnersByMatch.get(matchId) ?? { winners: [], puntos: 0 };
    entry.winners.push({ name, totalPuntos: bet.person?.puntos ?? 0, personId });
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

  const computeRanks = (totals: RankTotals): Map<string, number> => {
    const sorted = [...totals.entries()].sort(
      (a, b) => b[1].total - a[1].total || a[1].firstName.localeCompare(b[1].firstName),
    );
    const ranks = new Map<string, number>();
    sorted.forEach(([id], index) => ranks.set(id, index + 1));
    return ranks;
  };

  const rankMapAt = (cutoff: number, inclusive: boolean): Map<string, number> => {
    const totals: RankTotals = new Map();
    for (const [id, firstName] of firstNameById) {
      totals.set(id, { firstName, total: 0 });
    }
    for (const evolution of evolutions) {
      const id = evolution.person?.id;
      const entry = id ? totals.get(id) : undefined;
      if (!entry) {
        continue;
      }
      const endDate = new Date(evolution.matchEndDate ?? 0).getTime();
      if (inclusive ? endDate <= cutoff : endDate < cutoff) {
        entry.total += evolution.points ?? 0;
      }
    }
    return computeRanks(totals);
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
        const matchEnd = new Date(match.endDate ?? 0).getTime();
        const afterRanks = rankMapAt(matchEnd, true);
        const beforeRanks = rankMapAt(matchEnd, false);
        winners = rawWinners
          .map((winner): Winner => {
            const newRank = afterRanks.get(winner.personId) ?? 0;
            const beforeRank = beforeRanks.get(winner.personId) ?? newRank;
            return {
              name: winner.name,
              totalPuntos: winner.totalPuntos,
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
