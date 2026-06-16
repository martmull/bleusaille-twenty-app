import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { computePuntos, PuntosBet } from 'src/logic-functions/shared/compute-puntos';

type BetRecord = PuntosBet & { puntos: number | null; ev: number | null };

export type ComputePuntosResult = {
  evaluated: number;
  updated: number;
};

export const computeBetsPuntos = async (client: CoreApiClient): Promise<ComputePuntosResult> => {
  const bets = await fetchAllPages<BetRecord>(async (after) => {
    const { bets: page } = await client.query({
      bets: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: {
            id: true,
            betValue: true,
            won: true,
            puntos: true,
            ev: true,
            match: { id: true, result: true, stage: true },
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const updates: Array<{ id: string; data: { puntos: number; ev: null } }> = [];

  for (const bet of bets) {
    if (!bet.match?.result) {
      continue;
    }

    const puntos = computePuntos(bet, bets);

    if (bet.puntos === puntos && bet.ev === null) {
      continue;
    }

    updates.push({ id: bet.id, data: { puntos, ev: null } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateBets: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { evaluated: bets.length, updated };
};
