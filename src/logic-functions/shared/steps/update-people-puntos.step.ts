import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  buildFieldUpdates,
  fetchAllRecords,
} from 'src/logic-functions/shared/api';

type EvolutionRecord = { points: number | null; person: { id: string } | null };
type PersonRecord = { id: string; puntos: number | null };

export type UpdatePeoplePuntosResult = {
  people: number;
  updated: number;
};

export const updatePeoplePuntos = async (
  client: CoreApiClient,
): Promise<UpdatePeoplePuntosResult> => {
  const [evolutions, people] = await Promise.all([
    fetchAllRecords<EvolutionRecord>(client, 'puntosEvolutions', {
      points: true,
      person: { id: true },
    }),
    fetchAllRecords<PersonRecord>(client, 'people', { id: true, puntos: true }),
  ]);

  const puntosByPersonId = new Map<string, number>();
  for (const evolution of evolutions) {
    const personId = evolution.person?.id;
    if (!personId) {
      continue;
    }
    puntosByPersonId.set(personId, (puntosByPersonId.get(personId) ?? 0) + (evolution.points ?? 0));
  }

  // People absent from the evolutions map keep their current puntos, so skip
  // them (undefined) rather than writing a value.
  const updates = buildFieldUpdates(
    people,
    'puntos',
    (person) => person.puntos,
    (person) => puntosByPersonId.get(person.id),
  );

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { people: puntosByPersonId.size, updated };
};
