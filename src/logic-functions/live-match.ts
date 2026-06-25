import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';
import { fetchSportscoreLiveMatch } from 'src/logic-functions/shared/sportscore';
import { teamPairKey } from 'src/logic-functions/shared/team-aliases';

type MatchRecord = {
  home: string | null;
  away: string | null;
  startDate: string | null;
  endDate: string | null;
  stage: string | null;
};

type FootballDataMatch = {
  status: string;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
};

type LiveMatchState = 'LIVE' | 'HALF_TIME' | 'UPCOMING';

type LiveMatchDataSource = 'sportscore' | 'football-data';

type LiveScoreState = LiveMatchState | 'FINISHED';

type LiveScore = {
  state: LiveScoreState;
  homeScore: number | null;
  awayScore: number | null;
  dataSource: LiveMatchDataSource;
};

type LiveMatchEntry = {
  state: LiveMatchState;
  home: string;
  away: string;
  homeScore: number | null;
  awayScore: number | null;
  startDate?: string;
  stageLabel: string;
  dataSource?: LiveMatchDataSource;
};

type LiveMatchResponse = {
  found: boolean;
  matches: LiveMatchEntry[];
};

const IN_PROGRESS_STATUSES = new Set(['IN_PLAY', 'PAUSED']);

const LIVE_LOOKBACK_MS = 4 * 60 * 60 * 1000;
const FALLBACK_LIVE_WINDOW_MS = 3 * 60 * 60 * 1000;

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Phase de groupes',
  LAST_32: '16es de finale',
  LAST_16: '8es de finale',
  QUARTER_FINALS: 'Quarts de finale',
  SEMI_FINALS: 'Demi-finales',
  THIRD_PLACE: 'Petite finale',
  FINAL: 'Finale',
};

const toStageLabel = (stage: string | null): string =>
  (stage && STAGE_LABELS[stage]) || 'Coupe du Monde';

const fetchFootballDataLive = async (home: string, away: string): Promise<LiveScore | null> => {
  const matches = await fetchWorldCupMatches<FootballDataMatch>();
  const pairKey = teamPairKey(home, away);

  const match = matches.find(
    (candidate) =>
      candidate.homeTeam.name &&
      candidate.awayTeam.name &&
      teamPairKey(candidate.homeTeam.name, candidate.awayTeam.name) === pairKey,
  );

  if (!match) {
    return null;
  }

  if (match.status === 'FINISHED') {
    return {
      state: 'FINISHED',
      homeScore: match.score.fullTime.home,
      awayScore: match.score.fullTime.away,
      dataSource: 'football-data',
    };
  }

  if (!IN_PROGRESS_STATUSES.has(match.status)) {
    return null;
  }

  return {
    state: match.status === 'PAUSED' ? 'HALF_TIME' : 'LIVE',
    homeScore: match.score.fullTime.home,
    awayScore: match.score.fullTime.away,
    dataSource: 'football-data',
  };
};

const fetchLiveScore = async (home: string, away: string): Promise<LiveScore | null> => {
  const sportscore = await fetchSportscoreLiveMatch(home, away);

  if (sportscore) {
    return {
      state: sportscore.state,
      homeScore: sportscore.homeScore,
      awayScore: sportscore.awayScore,
      dataSource: 'sportscore',
    };
  }

  return fetchFootballDataLive(home, away);
};

const buildLiveEntry = (
  match: MatchRecord,
  state: LiveMatchState,
  live: LiveScore | null,
): LiveMatchEntry => ({
  state,
  home: match.home ?? '',
  away: match.away ?? '',
  homeScore: live?.homeScore ?? null,
  awayScore: live?.awayScore ?? null,
  startDate: match.startDate ?? undefined,
  stageLabel: toStageLabel(match.stage),
  dataSource: live?.dataSource,
});

const resolveLiveMatches = async (
  matches: MatchRecord[],
  nowMs: number,
): Promise<LiveMatchEntry[]> => {
  const candidates = matches
    .filter((match) => match.home && match.away && match.startDate)
    .filter((match) => {
      const startMs = new Date(match.startDate!).getTime();
      return startMs <= nowMs && nowMs - startMs <= LIVE_LOOKBACK_MS;
    })
    .sort((a, b) => new Date(b.startDate!).getTime() - new Date(a.startDate!).getTime());

  const resolved = await Promise.all(
    candidates.map(async (candidate) => {
      const live = await fetchLiveScore(candidate.home!, candidate.away!);

      if (live) {
        return live.state === 'FINISHED' ? null : buildLiveEntry(candidate, live.state, live);
      }

      const startMs = new Date(candidate.startDate!).getTime();
      const fallbackEndMs = candidate.endDate
        ? new Date(candidate.endDate).getTime()
        : startMs + FALLBACK_LIVE_WINDOW_MS;

      return nowMs <= fallbackEndMs ? buildLiveEntry(candidate, 'LIVE', null) : null;
    }),
  );

  return resolved.filter((entry): entry is LiveMatchEntry => entry !== null);
};

const handler = async (): Promise<LiveMatchResponse> => {
  const client = createCoreApiClient();

  const matches = await fetchAllPages<MatchRecord>(async (after) => {
    const { matches: page } = await client.query({
      matches: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: {
            home: true,
            away: true,
            startDate: true,
            endDate: true,
            stage: true,
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const now = Date.now();

  const liveMatches = await resolveLiveMatches(matches, now);
  if (liveMatches.length > 0) {
    return { found: true, matches: liveMatches };
  }

  const upcoming = matches
    .filter((match) => match.home && match.away && match.startDate)
    .filter((match) => new Date(match.startDate!).getTime() > now)
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime());

  if (upcoming.length === 0) {
    return { found: false, matches: [] };
  }

  const earliest = upcoming[0];
  const earliestStartMs = new Date(earliest.startDate!).getTime();
  const earliestEndMs = earliest.endDate
    ? new Date(earliest.endDate).getTime()
    : earliestStartMs + FALLBACK_LIVE_WINDOW_MS;

  const nextMatches = upcoming.filter(
    (match) => new Date(match.startDate!).getTime() < earliestEndMs,
  );

  return {
    found: true,
    matches: nextMatches.map((match) => ({
      state: 'UPCOMING' as const,
      home: match.home ?? '',
      away: match.away ?? '',
      homeScore: null,
      awayScore: null,
      startDate: match.startDate ?? undefined,
      stageLabel: toStageLabel(match.stage),
    })),
  };
};

export default defineLogicFunction({
  universalIdentifier: '79e1b7f5-9e11-4292-9975-6c3200145e88',
  name: 'live-match',
  description:
    'Returns the in-progress World Cup match (live score and status), or the next upcoming match.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/live-match',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
