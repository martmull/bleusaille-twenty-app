import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';

type PersonRecord = {
  name: { firstName: string | null } | null;
  puntos: number | null;
  winnings: number | null;
};

const handler = async () => {
  const client = createCoreApiClient();

  const people = await fetchAllPages<PersonRecord>(async (after) => {
    const { people: page } = await client.query({
      people: {
        __args: { first: PAGE_SIZE, after, orderBy: [{ puntos: 'DescNullsLast' }] },
        edges: { node: { name: { firstName: true }, puntos: true, winnings: true } },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const namesByScore = new Map<number, string[]>();
  const winningsByScore = new Map<number, number | null>();
  for (const person of people) {
    const score = person.puntos;
    const name = person.name?.firstName;
    if (score === null || score === undefined || !name) {
      continue;
    }
    const names = namesByScore.get(score) ?? [];
    names.push(name);
    namesByScore.set(score, names);
    winningsByScore.set(score, person.winnings ?? null);
  }

  const topScores = [...namesByScore.keys()].sort((a, b) => b - a).slice(0, 3);

  const podium = topScores.map((puntos, index) => ({
    rank: index + 1,
    puntos,
    names: (namesByScore.get(puntos) ?? []).sort((a, b) => a.localeCompare(b)),
    winnings: winningsByScore.get(puntos) ?? null,
  }));

  return { podium };
};

export default defineLogicFunction({
  universalIdentifier: 'd02c16c3-4abb-41fc-a242-e5c31f82d737',
  name: 'podium',
  description: 'Returns the top 3 distinct puntos scores with all the people tied at each place.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/podium',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
