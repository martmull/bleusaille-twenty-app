import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  chunk,
  fetchAllPages,
  PAGE_SIZE,
} from 'src/logic-functions/shared/api';

const BASELINE_MATCH_END_DATE = '2026-06-10T00:00:00.000Z';

type BetRecord = {
  id: string;
  name: string;
  puntos: number | null;
  person: { id: string; name: { firstName: string | null } } | null;
  match: { id: string | null; endDate: string | null; result: string | null } | null;
};

type EvolutionRecord = {
  id: string;
  name: string;
  matchEndDate: string | null;
  points: number | null;
};

export type ComputePuntosEvolutionResult = {
  dataPoints: number;
  created: number;
  updated: number;
};

export const computePuntosEvolution = async (
  client: CoreApiClient,
): Promise<ComputePuntosEvolutionResult> => {
  const [bets, existing] = await Promise.all([
    fetchAllPages<BetRecord>(async (after) => {
      const { bets: page } = await client.query({
        bets: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              name: true,
              puntos: true,
              person: { id: true, name: { firstName: true } },
              match: { id: true, endDate: true, result: true },
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    fetchAllPages<EvolutionRecord>(async (after) => {
      const { puntosEvolutions: page } = await client.query({
        puntosEvolutions: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              name: true,
              matchEndDate: true,
              points: true,
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const resolvedBets = bets.filter(
    (bet) =>
      bet.person?.id &&
      bet.match?.result &&
      bet.match.endDate &&
      bet.puntos !== null,
  );

  const betsByPerson = new Map<string, BetRecord[]>();
  for (const bet of resolvedBets) {
    const personId = bet.person!.id;
    const personBets = betsByPerson.get(personId) ?? [];
    personBets.push(bet);
    betsByPerson.set(personId, personBets);
  }

  type DataPoint = {
    name: string;
    personId: string;
    matchEndDate: string;
    points: number;
  };

  const dataPoints: DataPoint[] = [];

  const bettorNameById = new Map<string, string>();
  for (const bet of bets) {
    const personId = bet.person?.id;
    const firstName = bet.person?.name.firstName;
    if (personId && firstName) {
      bettorNameById.set(personId, firstName);
    }
  }

  for (const [personId, firstName] of bettorNameById) {
    dataPoints.push({
      name: `${firstName} - Start`,
      personId,
      matchEndDate: BASELINE_MATCH_END_DATE,
      points: 0,
    });
  }

  for (const [personId, personBets] of betsByPerson) {
    for (const bet of personBets) {
      dataPoints.push({
        name: bet.name,
        personId,
        matchEndDate: bet.match!.endDate as string,
        points: bet.puntos as number,
      });
    }
  }

  const existingByName = new Map(existing.map((record) => [record.name, record]));

  const toCreate: Array<{
    name: string;
    personId: string;
    matchEndDate: string;
    points: number;
  }> = [];
  const updates: Array<{ id: string; data: { matchEndDate: string; points: number } }> = [];

  for (const dataPoint of dataPoints) {
    const existingRecord = existingByName.get(dataPoint.name);

    if (!existingRecord) {
      toCreate.push({
        name: dataPoint.name,
        personId: dataPoint.personId,
        matchEndDate: dataPoint.matchEndDate,
        points: dataPoint.points,
      });
      continue;
    }

    const pointsChanged = existingRecord.points !== dataPoint.points;
    const endDateChanged =
      new Date(existingRecord.matchEndDate ?? 0).getTime() !==
      new Date(dataPoint.matchEndDate).getTime();

    if (pointsChanged || endDateChanged) {
      updates.push({
        id: existingRecord.id,
        data: { matchEndDate: dataPoint.matchEndDate, points: dataPoint.points },
      });
    }
  }

  for (const batch of chunk(toCreate, 50)) {
    await client.mutation({
      createPuntosEvolutions: { __args: { data: batch }, id: true },
    });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePuntosEvolutions: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { dataPoints: dataPoints.length, created: toCreate.length, updated };
};
