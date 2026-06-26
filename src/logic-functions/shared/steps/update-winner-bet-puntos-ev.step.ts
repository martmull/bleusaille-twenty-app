import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
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
  const people = await fetchAllPages<PersonRecord>(async (after) => {
    const { people: page } = await client.query({
      people: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: { id: true, wcWinnerBet: true, victoryChance: true, winnerBetPuntosEv: true },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const predictorsByTeam = new Map<string, number>();
  for (const person of people) {
    if (person.wcWinnerBet) {
      const team = person.wcWinnerBet.trim().toLowerCase();
      predictorsByTeam.set(team, (predictorsByTeam.get(team) ?? 0) + 1);
    }
  }

  const updates: Array<{ id: string; data: { winnerBetPuntosEv: number | null } }> = [];

  for (const person of people) {
    const team = person.wcWinnerBet?.trim().toLowerCase();
    const ev = computeWinnerBetPuntosEv({
      predictorsForTeam: team ? (predictorsByTeam.get(team) ?? 0) : 0,
      victoryChancePct: person.victoryChance,
    });

    if (person.winnerBetPuntosEv === ev) {
      continue;
    }

    updates.push({ id: person.id, data: { winnerBetPuntosEv: ev } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { participants: people.length, updated };
};
