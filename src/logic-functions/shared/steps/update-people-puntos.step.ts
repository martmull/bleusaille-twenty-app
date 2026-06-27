import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllRecords, round2 } from 'src/logic-functions/shared/api';

type EvolutionRecord = { points: number | null; person: { id: string } | null };
type BetRecord = { puntevs: number | null; person: { id: string } | null };
type PersonRecord = { id: string; puntos: number | null; puntevs: number | null };

export type UpdatePeoplePuntosResult = {
  people: number;
  peopleWithPuntevs: number;
  updated: number;
};

// Sum a numeric field grouped by the owning person, treating a null value as 0.
const sumByPersonId = <T extends { person: { id: string } | null }>(
  records: T[],
  valueOf: (record: T) => number | null,
): Map<string, number> => {
  const totals = new Map<string, number>();
  for (const record of records) {
    const personId = record.person?.id;
    if (!personId) {
      continue;
    }
    totals.set(personId, (totals.get(personId) ?? 0) + (valueOf(record) ?? 0));
  }
  return totals;
};

export const updatePeoplePuntos = async (
  client: CoreApiClient,
): Promise<UpdatePeoplePuntosResult> => {
  const [evolutions, bets, people] = await Promise.all([
    fetchAllRecords<EvolutionRecord>(client, 'puntosEvolutions', {
      points: true,
      person: { id: true },
    }),
    fetchAllRecords<BetRecord>(client, 'bets', {
      puntevs: true,
      person: { id: true },
    }),
    fetchAllRecords<PersonRecord>(client, 'people', {
      id: true,
      puntos: true,
      puntevs: true,
    }),
  ]);

  const puntosByPersonId = sumByPersonId(evolutions, (evolution) => evolution.points);
  // puntevs lives on the bet (only set for resolved matches); sum it per person.
  const puntevsByPersonId = sumByPersonId(bets, (bet) => bet.puntevs);

  // People absent from a totals map keep their current value, so leave that
  // field untouched (undefined) rather than writing one.
  const updates: Array<{ id: string; data: Record<string, number | null> }> = [];
  for (const person of people) {
    const data: Record<string, number | null> = {};

    const puntos = puntosByPersonId.get(person.id);
    if (puntos !== undefined && person.puntos !== puntos) {
      data.puntos = puntos;
    }

    const puntevs = puntevsByPersonId.get(person.id);
    const roundedPuntevs = puntevs === undefined ? undefined : round2(puntevs);
    if (roundedPuntevs !== undefined && person.puntevs !== roundedPuntevs) {
      data.puntevs = roundedPuntevs;
    }

    if (Object.keys(data).length > 0) {
      updates.push({ id: person.id, data });
    }
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return {
    people: puntosByPersonId.size,
    peopleWithPuntevs: puntevsByPersonId.size,
    updated,
  };
};
