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
  person: { name: { firstName: string | null } | null; puntos: number | null } | null;
  match: { id: string | null } | null;
};

type Winner = {
  name: string;
  totalPuntos: number;
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

  const [matches, winningBets] = await Promise.all([
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
              person: { name: { firstName: true }, puntos: true },
              match: { id: true },
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const winnersByMatch = new Map<string, { winners: Winner[]; puntos: number }>();
  for (const bet of winningBets) {
    const matchId = bet.match?.id;
    const name = bet.person?.name?.firstName;
    if (!matchId || !name) {
      continue;
    }
    const entry = winnersByMatch.get(matchId) ?? { winners: [], puntos: 0 };
    entry.winners.push({ name, totalPuntos: bet.person?.puntos ?? 0 });
    entry.puntos = Math.max(entry.puntos, bet.puntos ?? 0);
    winnersByMatch.set(matchId, entry);
  }

  const finished = matches
    .filter((match) => match.result && match.home && match.away)
    .sort(
      (a, b) =>
        new Date(b.endDate ?? 0).getTime() - new Date(a.endDate ?? 0).getTime(),
    )
    .map((match) => {
      const winners = winnersByMatch.get(match.id);
      return {
        home: match.home as string,
        away: match.away as string,
        score: match.score ?? '',
        endDate: match.endDate,
        puntos: winners?.puntos ?? 0,
        winners: (winners?.winners ?? []).sort((a, b) => a.name.localeCompare(b.name)),
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
