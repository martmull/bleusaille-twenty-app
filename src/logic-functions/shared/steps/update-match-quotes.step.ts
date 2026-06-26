import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  fetchAllPages,
  PAGE_SIZE,
  round2,
} from 'src/logic-functions/shared/api';
import { fetchMatchResultChances, MatchResultChances } from 'src/logic-functions/shared/odds';
import { canonicalTeamName, teamPairKey } from 'src/logic-functions/shared/team-aliases';
import { MatchType } from 'src/objects/match.object';

type MatchRecord = {
  id: string;
  home: string | null;
  away: string | null;
  startDate: string | null;
  score: string | null;
  stage: string | null;
  homeQuote: number | null;
  drawQuote: number | null;
  awayQuote: number | null;
  prematchHomeCote: number | null;
  prematchDrawCote: number | null;
  prematchAwayCote: number | null;
};

export type UpdateMatchQuotesResult = {
  matches: number;
  withQuotes: number;
  updated: number;
};

/**
 * Converts the three-way (home/draw/away) decimal prices into the two-way
 * winner (qualify) market used for knockout matches: the draw is removed and
 * the home and away implied probabilities are renormalised to sum to 100%, so
 * the returned cotes are real two-outcome odds (e.g. 2.0/–/4.0 -> 1.5/3.0).
 * Returns rounded decimal cotes, or null when a price is missing.
 */
const toQualifyCotes = (
  homePrice: number,
  awayPrice: number,
): { homeQuote: number | null; awayQuote: number | null } => {
  const homeInverse = homePrice > 0 ? 1 / homePrice : 0;
  const awayInverse = awayPrice > 0 ? 1 / awayPrice : 0;
  const total = homeInverse + awayInverse;

  if (total <= 0) {
    return { homeQuote: null, awayQuote: null };
  }

  return {
    homeQuote: homeInverse > 0 ? round2(total / homeInverse) || null : null,
    awayQuote: awayInverse > 0 ? round2(total / awayInverse) || null : null,
  };
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
              score: true,
              stage: true,
              homeQuote: true,
              drawQuote: true,
              awayQuote: true,
              prematchHomeCote: true,
              prematchDrawCote: true,
              prematchAwayCote: true,
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
    const hasScore = Boolean(match.score);

    const chance =
      !hasScore && match.home && match.away
        ? chancesByPair.get(teamPairKey(match.home, match.away))
        : undefined;

    // Pool (group-stage) matches can end in a draw, so we keep the three-way
    // home/draw/away cotes. Knockout matches always produce a qualifier, so we
    // take the two-way winner (qualify) cotes (HOME and AWAY only, no draw),
    // derived from the three-way odds with the draw removed and renormalised.
    const isPool = match.stage === MatchType.GROUP_STAGE;

    const rawHomePrice =
      chance && match.home ? chance.teamPrices.get(canonicalTeamName(match.home)) ?? 0 : 0;
    const rawAwayPrice =
      chance && match.away ? chance.teamPrices.get(canonicalTeamName(match.away)) ?? 0 : 0;

    let homeQuote: number | null = null;
    let awayQuote: number | null = null;
    let drawQuote: number | null = null;

    if (chance) {
      if (isPool) {
        homeQuote = round2(rawHomePrice) || null;
        awayQuote = round2(rawAwayPrice) || null;
        drawQuote = round2(chance.drawPrice) || null;
      } else {
        ({ homeQuote, awayQuote } = toQualifyCotes(rawHomePrice, rawAwayPrice));
        drawQuote = null;
      }
    }

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
