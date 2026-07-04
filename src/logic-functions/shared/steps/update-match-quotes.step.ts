import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  buildMatchTripleUpdates,
  fetchAllRecords,
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
  result: string | null;
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

export type MatchOddsScope = 'upcoming' | 'inProgress' | 'all';

const isPoolStage = (stage: string | null): boolean => stage === MatchType.GROUP_STAGE;

const matchPhase = (
  match: MatchRecord,
  now: number,
): 'done' | 'upcoming' | 'inProgress' => {
  if (match.result) {
    return 'done';
  }
  const started = match.startDate ? new Date(match.startDate).getTime() <= now : false;
  return started ? 'inProgress' : 'upcoming';
};

const isOddsTarget = (match: MatchRecord, now: number, scope: MatchOddsScope): boolean => {
  const phase = matchPhase(match, now);
  if (phase === 'done') {
    return false;
  }
  if (scope === 'all') {
    return true;
  }
  return scope === 'upcoming' ? phase === 'upcoming' : phase === 'inProgress';
};

export const updateMatchQuotes = async (
  client: CoreApiClient,
  chances?: Map<string, MatchResultChances>,
  qualifyChances?: Map<string, MatchQualifyChances>,
  scope: MatchOddsScope = 'all',
): Promise<UpdateMatchQuotesResult> => {
  const matches = await fetchAllRecords<MatchRecord>(client, 'matches', {
    id: true,
    home: true,
    away: true,
    startDate: true,
    result: true,
    stage: true,
    homeQuote: true,
    drawQuote: true,
    awayQuote: true,
    prematchHomeCote: true,
    prematchDrawCote: true,
    prematchAwayCote: true,
  });

  const now = Date.now();
  const targets = matches.filter(
    (match) => match.home && match.away && isOddsTarget(match, now, scope),
  );
  const targetIds = new Set(targets.map((match) => match.id));

  const hasPoolTarget = targets.some((match) => isPoolStage(match.stage));
  const chancesByPair =
    chances ?? (hasPoolTarget ? await fetchMatchResultChances() : new Map<string, MatchResultChances>());

  // Knockout matches use the two-way "qualify" (draw-no-bet) market, which is
  // only available through per-event requests, so we resolve it only for the
  // target pairs that need it rather than for every match.
  const qualifyPairKeys = new Set<string>();
  for (const match of targets) {
    if (match.home && match.away && !isPoolStage(match.stage)) {
      qualifyPairKeys.add(teamPairKey(match.home, match.away));
    }
  }
  const qualifyByPair = qualifyChances ?? (await fetchMatchQualifyChances(qualifyPairKeys));

  let withQuotes = 0;

  const updates = buildMatchTripleUpdates(
    matches,
    {
      live: ['homeQuote', 'drawQuote', 'awayQuote'],
      prematch: ['prematchHomeCote', 'prematchDrawCote', 'prematchAwayCote'],
    },
    (match) => {
      const hasResult = Boolean(match.result);
      const pairKey = match.home && match.away ? teamPairKey(match.home, match.away) : null;
      const isTarget = targetIds.has(match.id);

      let homeQuote: number | null = null;
      let awayQuote: number | null = null;
      let drawQuote: number | null = null;
      let hasQuotes = false;

      // Finished matches keep no live cotes. Non-target matches (out of scope)
      // keep their stored cotes. Targets fetch fresh ones but fall back to the
      // last known cote when none is available, so quotes don't disappear
      // mid-match.
      if (!hasResult && !isTarget) {
        homeQuote = match.homeQuote;
        drawQuote = match.drawQuote;
        awayQuote = match.awayQuote;
      } else if (!hasResult && pairKey && isTarget) {
        if (isPoolStage(match.stage)) {
          // Pool (group-stage) matches can end in a draw, so we keep the
          // three-way home/draw/away cotes.
          const chance = chancesByPair.get(pairKey);
          const freshHomeQuote =
            chance && match.home
              ? round2(chance.teamPrices.get(canonicalTeamName(match.home)) ?? 0) || null
              : null;
          const freshAwayQuote =
            chance && match.away
              ? round2(chance.teamPrices.get(canonicalTeamName(match.away)) ?? 0) || null
              : null;
          const freshDrawQuote = chance ? round2(chance.drawPrice) || null : null;

          homeQuote = freshHomeQuote ?? match.homeQuote;
          awayQuote = freshAwayQuote ?? match.awayQuote;
          drawQuote = freshDrawQuote ?? match.drawQuote;
          hasQuotes = Boolean(chance);
        } else {
          // Knockout matches always produce a qualifier, so we take the two-way
          // winner (qualify) cotes from the draw-no-bet market: HOME and AWAY
          // only, no draw.
          const qualify = qualifyByPair.get(pairKey);
          const freshHomeQuote =
            qualify && match.home
              ? round2(qualify.teamPrices.get(canonicalTeamName(match.home)) ?? 0) || null
              : null;
          const freshAwayQuote =
            qualify && match.away
              ? round2(qualify.teamPrices.get(canonicalTeamName(match.away)) ?? 0) || null
              : null;

          homeQuote = freshHomeQuote ?? match.homeQuote;
          awayQuote = freshAwayQuote ?? match.awayQuote;
          drawQuote = null;
          hasQuotes = Boolean(qualify);
        }
      }

      if (hasQuotes) {
        withQuotes += 1;
      }

      return { home: homeQuote, draw: drawQuote, away: awayQuote };
    },
    now,
  );

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateMatches: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { matches: matches.length, withQuotes, updated };
};
