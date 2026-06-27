import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  buildFieldUpdates,
  fetchAllRecords,
  round2,
} from 'src/logic-functions/shared/api';

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

  const updates = buildFieldUpdates(
    people,
    'puntosWcwEv',
    (person) => person.puntosWcwEv,
    (person) =>
      person.puntos === null && person.winnerBetPuntosEv === null
        ? null
        : round2((person.puntos ?? 0) + (person.winnerBetPuntosEv ?? 0)),
  );

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { participants: people.length, updated };
};
