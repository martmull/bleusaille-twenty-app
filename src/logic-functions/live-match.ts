import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { selectCurrentMatch } from 'src/logic-functions/shared/current-match';
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

type LiveScore = {
  state: LiveMatchState;
  homeScore: number | null;
  awayScore: number | null;
  dataSource: LiveMatchDataSource;
};

type LiveMatchResponse = {
  found: boolean;
  state?: LiveMatchState;
  home?: string;
  away?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  startDate?: string;
  stageLabel?: string;
  dataSource?: LiveMatchDataSource;
};

const IN_PROGRESS_STATUSES = new Set(['IN_PLAY', 'PAUSED']);

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

  if (!match || !IN_PROGRESS_STATUSES.has(match.status)) {
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
      state:
        sportscore.state === 'HALF_TIME'
          ? 'HALF_TIME'
          : sportscore.state === 'UPCOMING'
            ? 'UPCOMING'
            : 'LIVE',
      homeScore: sportscore.homeScore,
      awayScore: sportscore.awayScore,
      dataSource: 'sportscore',
    };
  }

  return fetchFootballDataLive(home, away);
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

  const selection = selectCurrentMatch(matches, Date.now());

  if (!selection) {
    return { found: false };
  }

  const { match, inProgress } = selection;

  let state: LiveMatchState = inProgress ? 'LIVE' : 'UPCOMING';
  let homeScore: number | null = null;
  let awayScore: number | null = null;
  let dataSource: LiveMatchDataSource | undefined;

  if (inProgress) {
    const live = await fetchLiveScore(match.home!, match.away!);
    if (live) {
      state = live.state;
      homeScore = live.homeScore;
      awayScore = live.awayScore;
      dataSource = live.dataSource;
    }
  }

  return {
    found: true,
    state,
    home: match.home ?? '',
    away: match.away ?? '',
    homeScore,
    awayScore,
    startDate: match.startDate ?? undefined,
    stageLabel: toStageLabel(match.stage),
    dataSource,
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
