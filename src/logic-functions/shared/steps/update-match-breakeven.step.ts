import { CoreApiClient } from 'twenty-client-sdk/core';

import { NUMBER_OF_BETTORS } from 'src/constants/tournament';
import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { computeBreakeven } from 'src/logic-functions/shared/match-breakeven';

type MatchRecord = {
  id: string;
  startDate: string | null;
  score: string | null;
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
  const matches = await fetchAllPages<MatchRecord>(async (after) => {
    const { matches: page } = await client.query({
      matches: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: {
            id: true,
            startDate: true,
            score: true,
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
  });

  // The bettor pool is fixed for the tournament, so there is no need to count
  // people on every run.
  const totalBets = NUMBER_OF_BETTORS;

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
    const hasScore = Boolean(match.score);

    const homeBreakeven = hasScore ? null : computeBreakeven(totalBets, match.homeQuote);
    const drawBreakeven = hasScore ? null : computeBreakeven(totalBets, match.drawQuote);
    const awayBreakeven = hasScore ? null : computeBreakeven(totalBets, match.awayQuote);

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
