import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';

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
    fetchAllPages<EvolutionRecord>(async (after) => {
      const { puntosEvolutions: page } = await client.query({
        puntosEvolutions: {
          __args: { first: PAGE_SIZE, after },
          edges: { node: { points: true, person: { id: true } } },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    fetchAllPages<PersonRecord>(async (after) => {
      const { people: page } = await client.query({
        people: {
          __args: { first: PAGE_SIZE, after },
          edges: { node: { id: true, puntos: true } },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const puntosByPersonId = new Map<string, number>();
  for (const evolution of evolutions) {
    const personId = evolution.person?.id;
    if (!personId) {
      continue;
    }
    puntosByPersonId.set(personId, (puntosByPersonId.get(personId) ?? 0) + (evolution.points ?? 0));
  }

  const updates: Array<{ id: string; data: { puntos: number } }> = [];

  for (const person of people) {
    if (!puntosByPersonId.has(person.id)) {
      continue;
    }

    const puntos = puntosByPersonId.get(person.id) as number;

    if (person.puntos === puntos) {
      continue;
    }

    updates.push({ id: person.id, data: { puntos } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { people: puntosByPersonId.size, updated };
};
