import { CoreApiClient } from 'twenty-client-sdk/core';

import { NUMBER_OF_BETTORS } from 'src/constants/tournament';
import {
  applyGroupedUpdates,
  buildMatchTripleUpdates,
  fetchAllRecords,
} from 'src/logic-functions/shared/api';
import { computeBreakeven } from 'src/logic-functions/shared/match-breakeven';

type MatchRecord = {
  id: string;
  startDate: string | null;
  result: string | null;
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
  const matches = await fetchAllRecords<MatchRecord>(client, 'matches', {
    id: true,
    startDate: true,
    result: true,
    homeQuote: true,
    drawQuote: true,
    awayQuote: true,
    homeBreakeven: true,
    drawBreakeven: true,
    awayBreakeven: true,
    prematchHomeBreakeven: true,
    prematchDrawBreakeven: true,
    prematchAwayBreakeven: true,
  });

  // The bettor pool is fixed for the tournament, so there is no need to count
  // people on every run.
  const totalBets = NUMBER_OF_BETTORS;

  const updates = buildMatchTripleUpdates(
    matches,
    {
      live: ['homeBreakeven', 'drawBreakeven', 'awayBreakeven'],
      prematch: ['prematchHomeBreakeven', 'prematchDrawBreakeven', 'prematchAwayBreakeven'],
    },
    (match) => {
      const hasResult = Boolean(match.result);
      return {
        home: hasResult ? null : computeBreakeven(totalBets, match.homeQuote),
        draw: hasResult ? null : computeBreakeven(totalBets, match.drawQuote),
        away: hasResult ? null : computeBreakeven(totalBets, match.awayQuote),
      };
    },
    Date.now(),
  );

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateMatches: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { matches: matches.length, updated };
};
