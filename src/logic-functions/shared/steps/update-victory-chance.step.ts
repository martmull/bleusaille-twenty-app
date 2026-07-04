import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllRecords } from 'src/logic-functions/shared/api';
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
  options: { refresh?: boolean } = {},
): Promise<UpdateVictoryChanceResult> => {
  if (options.refresh === false && !winnerChances) {
    return { teamsFromOdds: 0, updated: 0, unmatched: 0 };
  }

  const [chancesByTeam, people] = await Promise.all([
    winnerChances ?? fetchWorldCupWinnerChances(),
    fetchAllRecords<PersonRecord>(client, 'people', {
      id: true,
      wcWinnerBet: true,
      victoryChance: true,
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
