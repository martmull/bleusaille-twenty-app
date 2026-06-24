import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  fetchAllPages,
  PAGE_SIZE,
  round2,
} from 'src/logic-functions/shared/api';
import { fetchMatchResultChances, MatchResultChances } from 'src/logic-functions/shared/odds';
import { canonicalTeamName, teamPairKey } from 'src/logic-functions/shared/team-aliases';

type MatchRecord = {
  id: string;
  home: string | null;
  away: string | null;
  startDate: string | null;
  homeQuote: number | null;
  drawQuote: number | null;
  awayQuote: number | null;
  prematchHomeCote: number | null;
  prematchDrawCote: number | null;
  prematchAwayCote: number | null;
  result: string | null;
};

export type UpdateMatchQuotesResult = {
  matches: number;
  withQuotes: number;
  updated: number;
};

export const updateMatchQuotes = async (
  client: CoreApiClient,
  chances?: Map<string, MatchResultChances>,
): Promise<UpdateMatchQuotesResult> => {
  const [chancesByPair, matches] = await Promise.all([
    chances ? Promise.resolve(chances) : fetchMatchResultChances(),
    fetchAllPages<MatchRecord>(async (after) => {
      const { matches: page } = await client.query({
        matches: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              home: true,
              away: true,
              startDate: true,
              homeQuote: true,
              drawQuote: true,
              awayQuote: true,
              prematchHomeCote: true,
              prematchDrawCote: true,
              prematchAwayCote: true,
              result: true,
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const updates: Array<{
    id: string;
    data: {
      homeQuote: number | null;
      drawQuote: number | null;
      awayQuote: number | null;
      prematchHomeCote?: number | null;
      prematchDrawCote?: number | null;
      prematchAwayCote?: number | null;
    };
  }> = [];
  let withQuotes = 0;

  const now = Date.now();

  for (const match of matches) {
    if (match.result) {
      continue;
    }

    const chance =
      match.home && match.away
        ? chancesByPair.get(teamPairKey(match.home, match.away))
        : undefined;

    const homeQuote =
      chance && match.home
        ? round2(chance.teamPrices.get(canonicalTeamName(match.home)) ?? 0) || null
        : null;
    const awayQuote =
      chance && match.away
        ? round2(chance.teamPrices.get(canonicalTeamName(match.away)) ?? 0) || null
        : null;
    const drawQuote = chance ? round2(chance.drawPrice) || null : null;

    if (chance) {
      withQuotes += 1;
    }

    const isUpcoming = match.startDate ? new Date(match.startDate).getTime() > now : false;

    const prematchChanged =
      isUpcoming &&
      (match.prematchHomeCote !== homeQuote ||
        match.prematchDrawCote !== drawQuote ||
        match.prematchAwayCote !== awayQuote);

    const quotesChanged =
      match.homeQuote !== homeQuote ||
      match.drawQuote !== drawQuote ||
      match.awayQuote !== awayQuote;

    if (!quotesChanged && !prematchChanged) {
      continue;
    }

    updates.push({
      id: match.id,
      data: {
        homeQuote,
        drawQuote,
        awayQuote,
        ...(isUpcoming
          ? {
              prematchHomeCote: homeQuote,
              prematchDrawCote: drawQuote,
              prematchAwayCote: awayQuote,
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

  return { matches: matches.length, withQuotes, updated };
};
