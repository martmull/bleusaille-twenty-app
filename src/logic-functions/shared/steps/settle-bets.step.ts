import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';

type BetWithMatch = {
  id: string;
  betValue: string;
  won: boolean | null;
  match: { result: string | null } | null;
};

export type SettleBetsResult = {
  evaluated: number;
  settled: number;
};

export const settleBets = async (client: CoreApiClient): Promise<SettleBetsResult> => {
  const bets = await fetchAllPages<BetWithMatch>(async (after) => {
    const { bets: page } = await client.query({
      bets: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: {
            id: true,
            betValue: true,
            won: true,
            match: { result: true },
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const updates: Array<{ id: string; data: { won: boolean } }> = [];

  for (const bet of bets) {
    const result = bet.match?.result;

    if (!result) {
      continue;
    }

    const won = bet.betValue === result;

    if (bet.won === won) {
      continue;
    }

    updates.push({ id: bet.id, data: { won } });
  }

  const settled = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateBets: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { evaluated: bets.length, settled };
};
