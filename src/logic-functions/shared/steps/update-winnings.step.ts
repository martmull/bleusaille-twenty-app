import { CoreApiClient } from 'twenty-client-sdk/core';

import { NUMBER_OF_BETTORS } from 'src/constants/tournament';
import {
  applyGroupedUpdates,
  buildFieldUpdates,
  fetchAllRecords,
  round2,
} from 'src/logic-functions/shared/api';
import { computePotValueEur, fetchSpacexPriceUsd } from 'src/logic-functions/shared/pot';
import { computeWinnings, WinningsGroup } from 'src/logic-functions/shared/winnings';

type PersonRecord = {
  id: string;
  puntos: number | null;
  winnings: number | null;
};

export type UpdateWinningsResult = {
  potValueEur: number;
  updated: number;
};

export const updateWinnings = async (
  client: CoreApiClient,
): Promise<UpdateWinningsResult> => {
  const [people, priceUsd] = await Promise.all([
    fetchAllRecords<PersonRecord>(client, 'people', { id: true, puntos: true, winnings: true }),
    fetchSpacexPriceUsd(),
  ]);

  const potValueEur = computePotValueEur(priceUsd, NUMBER_OF_BETTORS);

  const idsByScore = new Map<number, string[]>();
  for (const person of people) {
    if (person.puntos === null) {
      continue;
    }
    const ids = idsByScore.get(person.puntos) ?? [];
    ids.push(person.id);
    idsByScore.set(person.puntos, ids);
  }

  const topScores = [...idsByScore.keys()].sort((a, b) => b - a).slice(0, 3);
  const groups: WinningsGroup[] = topScores.map((puntos) => ({
    puntos,
    personIds: idsByScore.get(puntos) as string[],
  }));

  const winningsById = computeWinnings(potValueEur, groups);

  const updates = buildFieldUpdates(
    people,
    'winnings',
    (person) => person.winnings,
    (person) => winningsById.get(person.id) ?? null,
  );

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updatePeople: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { potValueEur: round2(potValueEur), updated };
};
