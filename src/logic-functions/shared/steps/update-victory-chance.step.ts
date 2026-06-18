import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { fetchWorldCupWinnerChances } from 'src/logic-functions/shared/odds';

type PersonRecord = {
  id: string;
  wcWinnerBet: string | null;
  victoryChance: number | null;
};

export type UpdateVictoryChanceResult = {
  teamsFromOdds: number;
  updated: number;
  unmatched: number;
};

export const updateVictoryChance = async (
  client: CoreApiClient,
  winnerChances?: Map<string, number>,
): Promise<UpdateVictoryChanceResult> => {
  const [chancesByTeam, people] = await Promise.all([
    winnerChances ?? fetchWorldCupWinnerChances(),
    fetchAllPages<PersonRecord>(async (after) => {
      const { people: page } = await client.query({
        people: {
          __args: { first: PAGE_SIZE, after },
          edges: { node: { id: true, wcWinnerBet: true, victoryChance: true } },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const updates: Array<{ id: string; data: { victoryChance: number | null } }> = [];
  let unmatched = 0;

  for (const person of people) {
    if (!person.wcWinnerBet) {
      continue;
    }

    const chance = chancesByTeam.get(person.wcWinnerBet.trim().toLowerCase()) ?? null;

    if (chance === null) {
      unmatched += 1;
    }

    if (person.victoryChance === chance) {
      continue;
    }

    updates.push({ id: person.id, data: { victoryChance: chance } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { teamsFromOdds: chancesByTeam.size, updated, unmatched };
};
