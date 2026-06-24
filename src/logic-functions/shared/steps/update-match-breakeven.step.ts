import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { computeBreakeven } from 'src/logic-functions/shared/match-breakeven';

type MatchRecord = {
  id: string;
  startDate: string | null;
  homeQuote: number | null;
  drawQuote: number | null;
  awayQuote: number | null;
  homeBreakeven: number | null;
  drawBreakeven: number | null;
  awayBreakeven: number | null;
  prematchHomeBreakeven: number | null;
  prematchDrawBreakeven: number | null;
  prematchAwayBreakeven: number | null;
};

export type UpdateMatchBreakevenResult = {
  matches: number;
  updated: number;
};

export const updateMatchBreakeven = async (
  client: CoreApiClient,
): Promise<UpdateMatchBreakevenResult> => {
  const [matches, totalCountResult] = await Promise.all([
    fetchAllPages<MatchRecord>(async (after) => {
      const { matches: page } = await client.query({
        matches: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              startDate: true,
              homeQuote: true,
              drawQuote: true,
              awayQuote: true,
              homeBreakeven: true,
              drawBreakeven: true,
              awayBreakeven: true,
              prematchHomeBreakeven: true,
              prematchDrawBreakeven: true,
              prematchAwayBreakeven: true,
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    client.query({ people: { __args: { first: 1 }, totalCount: true } }),
  ]);

  const totalBets = totalCountResult.people.totalCount;

  const updates: Array<{
    id: string;
    data: {
      homeBreakeven: number | null;
      drawBreakeven: number | null;
      awayBreakeven: number | null;
      prematchHomeBreakeven?: number | null;
      prematchDrawBreakeven?: number | null;
      prematchAwayBreakeven?: number | null;
    };
  }> = [];

  const now = Date.now();

  for (const match of matches) {
    const homeBreakeven = computeBreakeven(totalBets, match.homeQuote);
    const drawBreakeven = computeBreakeven(totalBets, match.drawQuote);
    const awayBreakeven = computeBreakeven(totalBets, match.awayQuote);

    const isUpcoming = match.startDate ? new Date(match.startDate).getTime() > now : false;

    const prematchChanged =
      isUpcoming &&
      (match.prematchHomeBreakeven !== homeBreakeven ||
        match.prematchDrawBreakeven !== drawBreakeven ||
        match.prematchAwayBreakeven !== awayBreakeven);

    const breakevenChanged =
      match.homeBreakeven !== homeBreakeven ||
      match.drawBreakeven !== drawBreakeven ||
      match.awayBreakeven !== awayBreakeven;

    if (!breakevenChanged && !prematchChanged) {
      continue;
    }

    updates.push({
      id: match.id,
      data: {
        homeBreakeven,
        drawBreakeven,
        awayBreakeven,
        ...(isUpcoming
          ? {
              prematchHomeBreakeven: homeBreakeven,
              prematchDrawBreakeven: drawBreakeven,
              prematchAwayBreakeven: awayBreakeven,
            }
          : {}),
      },
    });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateMatches: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { matches: matches.length, updated };
};
