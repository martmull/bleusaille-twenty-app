import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllRecords, round2 } from 'src/logic-functions/shared/api';

type PersonRecord = {
  id: string;
  puntos: number | null;
  winnerBetPuntosEv: number | null;
  puntosWcwEv: number | null;
};

export type UpdatePuntosWcwEvResult = {
  participants: number;
  updated: number;
};

export const updatePuntosWcwEv = async (
  client: CoreApiClient,
): Promise<UpdatePuntosWcwEvResult> => {
  const people = await fetchAllRecords<PersonRecord>(client, 'people', {
    id: true,
    puntos: true,
    winnerBetPuntosEv: true,
    puntosWcwEv: true,
  });

  const updates: Array<{ id: string; data: { puntosWcwEv: number | null } }> = [];

  for (const person of people) {
    const target =
      person.puntos === null && person.winnerBetPuntosEv === null
        ? null
        : round2((person.puntos ?? 0) + (person.winnerBetPuntosEv ?? 0));

    if (person.puntosWcwEv === target) {
      continue;
    }

    updates.push({ id: person.id, data: { puntosWcwEv: target } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { participants: people.length, updated };
};
