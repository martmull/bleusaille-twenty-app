import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  fetchAllPages,
  PAGE_SIZE,
  round2,
} from 'src/logic-functions/shared/api';
import {
  fetchMatchQualifyChances,
  fetchMatchResultChances,
  MatchQualifyChances,
  MatchResultChances,
} from 'src/logic-functions/shared/odds';
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

const isPoolStage = (stage: string | null): boolean => stage === MatchType.GROUP_STAGE;

export const updateMatchQuotes = async (
  client: CoreApiClient,
  chances?: Map<string, MatchResultChances>,
  qualifyChances?: Map<string, MatchQualifyChances>,
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

  // Knockout matches use the two-way "qualify" (draw-no-bet) market, which is
  // only available through per-event requests, so we resolve it for the pairs
  // that need it rather than for every match.
  const qualifyPairKeys = new Set<string>();
  for (const match of matches) {
    if (!match.score && match.home && match.away && !isPoolStage(match.stage)) {
      qualifyPairKeys.add(teamPairKey(match.home, match.away));
    }
  }
  const qualifyByPair = qualifyChances ?? (await fetchMatchQualifyChances(qualifyPairKeys));

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
    const pairKey = match.home && match.away ? teamPairKey(match.home, match.away) : null;

    let homeQuote: number | null = null;
    let awayQuote: number | null = null;
    let drawQuote: number | null = null;
    let hasQuotes = false;

    if (!hasScore && pairKey) {
      if (isPoolStage(match.stage)) {
        // Pool (group-stage) matches can end in a draw, so we keep the
        // three-way home/draw/away cotes.
        const chance = chancesByPair.get(pairKey);
        if (chance) {
          homeQuote = match.home
            ? round2(chance.teamPrices.get(canonicalTeamName(match.home)) ?? 0) || null
            : null;
          awayQuote = match.away
            ? round2(chance.teamPrices.get(canonicalTeamName(match.away)) ?? 0) || null
            : null;
          drawQuote = round2(chance.drawPrice) || null;
          hasQuotes = true;
        }
      } else {
        // Knockout matches always produce a qualifier, so we take the two-way
        // winner (qualify) cotes from the draw-no-bet market: HOME and AWAY
        // only, no draw.
        const qualify = qualifyByPair.get(pairKey);
        if (qualify) {
          homeQuote = match.home
            ? round2(qualify.teamPrices.get(canonicalTeamName(match.home)) ?? 0) || null
            : null;
          awayQuote = match.away
            ? round2(qualify.teamPrices.get(canonicalTeamName(match.away)) ?? 0) || null
            : null;
          drawQuote = null;
          hasQuotes = true;
        }
      }
    }

    if (hasQuotes) {
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
