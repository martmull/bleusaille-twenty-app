import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { KicktippWcWinner, scrapeKicktippWcWinners } from 'src/logic-functions/shared/kicktipp';

type PersonRecord = {
  id: string;
  name: { firstName: string | null };
  wcWinnerBet: string | null;
};

export type UpdateWcWinnerBetsResult = {
  scraped: number;
  updated: number;
  unmatched: number;
};

export const updateWcWinnerBets = async (
  client: CoreApiClient,
  wcWinners?: KicktippWcWinner[],
): Promise<UpdateWcWinnerBetsResult> => {
  const [winners, people] = await Promise.all([
    wcWinners ?? scrapeKicktippWcWinners(),
    fetchAllPages<PersonRecord>(async (after) => {
      const { people: page } = await client.query({
        people: {
          __args: { first: PAGE_SIZE, after },
          edges: { node: { id: true, name: { firstName: true }, wcWinnerBet: true } },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const teamByPlayer = new Map(winners.map((winner) => [winner.player, winner.team]));

  const personByName = new Map(
    people
      .filter((person) => person.name.firstName)
      .map((person) => [person.name.firstName as string, person]),
  );

  const updates: Array<{ id: string; data: { wcWinnerBet: string } }> = [];
  let unmatched = 0;

  for (const [player, team] of teamByPlayer) {
    const person = personByName.get(player);

    if (!person) {
      unmatched += 1;
      continue;
    }

    if (person.wcWinnerBet === team) {
      continue;
    }

    updates.push({ id: person.id, data: { wcWinnerBet: team } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { scraped: winners.length, updated, unmatched };
};
