import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  applyGroupedUpdates,
  chunk,
  fetchAllPages,
  PAGE_SIZE,
} from 'src/logic-functions/shared/api';
import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';
import { MatchResult, MatchType } from 'src/objects/match.object';

export type FootballDataMatch = {
  utcDate: string;
  status: string;
  stage: string;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: {
    winner: 'HOME_TEAM' | 'AWAY_TEAM' | 'DRAW' | null;
    duration: 'REGULAR' | 'EXTRA_TIME' | 'PENALTY_SHOOTOUT' | null;
    fullTime: { home: number | null; away: number | null };
  };
};

type MatchRecord = {
  id: string;
  name: string;
  home: string;
  away: string;
  startDate: string | null;
  endDate: string | null;
  score: string;
  result: string | null;
  stage: string | null;
};

export type SyncMatchesResult = {
  created: number;
  updated: number;
  total: number;
};

const STAGE_TO_TYPE: Record<string, MatchType> = {
  GROUP_STAGE: MatchType.GROUP_STAGE,
  LAST_32: MatchType.LAST_32,
  LAST_16: MatchType.LAST_16,
  QUARTER_FINALS: MatchType.QUARTER_FINALS,
  SEMI_FINALS: MatchType.SEMI_FINALS,
  THIRD_PLACE: MatchType.THIRD_PLACE,
  FINAL: MatchType.FINAL,
};

const MATCH_DURATION_MINUTES: Record<NonNullable<FootballDataMatch['score']['duration']>, number> = {
  REGULAR: 120,
  EXTRA_TIME: 150,
  PENALTY_SHOOTOUT: 165,
};

const toResult = (match: FootballDataMatch): MatchResult | null => {
  if (match.status !== 'FINISHED') {
    return null;
  }

  const { winner } = match.score;

  if (winner === 'HOME_TEAM') return MatchResult.HOME_WIN;
  if (winner === 'AWAY_TEAM') return MatchResult.AWAY_WIN;
  if (winner === 'DRAW') return MatchResult.NULL_OR_DRAW;
  return null;
};

const toScore = (match: FootballDataMatch): string => {
  const { home, away } = match.score.fullTime;

  if (match.status !== 'FINISHED' || home === null || away === null) {
    return '';
  }

  return `${home}-${away}`;
};

const toEndDate = (match: FootballDataMatch): string => {
  const durationMinutes = MATCH_DURATION_MINUTES[match.score.duration ?? 'REGULAR'];
  return new Date(new Date(match.utcDate).getTime() + durationMinutes * 60_000).toISOString();
};

export const syncMatches = async (
  client: CoreApiClient,
  apiMatches?: FootballDataMatch[],
): Promise<SyncMatchesResult> => {
  const [resolvedMatches, existingMatches] = await Promise.all([
    apiMatches ?? fetchWorldCupMatches<FootballDataMatch>(),
    fetchAllPages<MatchRecord>(async (after) => {
      const { matches } = await client.query({
        matches: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              name: true,
              home: true,
              away: true,
              startDate: true,
              endDate: true,
              score: true,
              result: true,
              stage: true,
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });

      return matches;
    }),
  ]);

  const existingMatchesByName = new Map(existingMatches.map((match) => [match.name, match]));

  const toCreate: Array<Record<string, unknown>> = [];
  const updates: Array<{
    id: string;
    data: {
      startDate: string;
      endDate: string;
      score: string;
      result: MatchResult | null;
      stage: MatchType | null;
    };
  }> = [];

  for (const apiMatch of resolvedMatches) {
    const home = apiMatch.homeTeam.name;
    const away = apiMatch.awayTeam.name;

    if (!home || !away) {
      continue;
    }

    const name = `${home} vs ${away}`;
    const score = toScore(apiMatch);
    const result = toResult(apiMatch);
    const startDate = apiMatch.utcDate;
    const endDate = toEndDate(apiMatch);
    const stage = STAGE_TO_TYPE[apiMatch.stage] ?? null;

    const existing = existingMatchesByName.get(name);

    if (!existing) {
      toCreate.push({ name, home, away, startDate, endDate, score, result, stage });
      continue;
    }

    const startDateChanged =
      new Date(existing.startDate ?? 0).getTime() !== new Date(startDate).getTime();
    const endDateChanged =
      new Date(existing.endDate ?? 0).getTime() !== new Date(endDate).getTime();
    const scoreChanged = (existing.score ?? '') !== score;
    const resultChanged = (existing.result ?? null) !== result;
    const stageChanged = (existing.stage ?? null) !== stage;

    if (startDateChanged || endDateChanged || scoreChanged || resultChanged || stageChanged) {
      updates.push({ id: existing.id, data: { startDate, endDate, score, result, stage } });
    }
  }

  for (const batch of chunk(toCreate, 50)) {
    await client.mutation({
      createMatches: {
        __args: { data: batch },
        id: true,
      },
    });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateMatches: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return {
    created: toCreate.length,
    updated,
    total: resolvedMatches.length,
  };
};
