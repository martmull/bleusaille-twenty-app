import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  buildFieldUpdates,
  fetchAllRecords,
} from 'src/logic-functions/shared/api';
import { computeWinnerBetPuntosEv } from 'src/logic-functions/shared/winner-bet-puntos-ev';

type PersonRecord = {
  id: string;
  wcWinnerBet: string | null;
  victoryChance: number | null;
  winnerBetPuntosEv: number | null;
};

export type UpdateWinnerBetPuntosEvResult = {
  participants: number;
  updated: number;
};

export const updateWinnerBetPuntosEv = async (
  client: CoreApiClient,
): Promise<UpdateWinnerBetPuntosEvResult> => {
  const people = await fetchAllRecords<PersonRecord>(client, 'people', {
    id: true,
    wcWinnerBet: true,
    victoryChance: true,
    winnerBetPuntosEv: true,
  });

  const predictorsByTeam = new Map<string, number>();
  for (const person of people) {
    if (person.wcWinnerBet) {
      const team = person.wcWinnerBet.trim().toLowerCase();
      predictorsByTeam.set(team, (predictorsByTeam.get(team) ?? 0) + 1);
    }
  }

  const updates = buildFieldUpdates(
    people,
    'winnerBetPuntosEv',
    (person) => person.winnerBetPuntosEv,
    (person) => {
      const team = person.wcWinnerBet?.trim().toLowerCase();
      return computeWinnerBetPuntosEv({
        predictorsForTeam: team ? (predictorsByTeam.get(team) ?? 0) : 0,
        victoryChancePct: person.victoryChance,
      });
    },
  );

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { participants: people.length, updated };
};
