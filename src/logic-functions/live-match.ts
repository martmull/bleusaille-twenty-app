import { defineLogicFunction } from 'twenty-sdk/define';

import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';

type FootballDataMatch = {
  utcDate: string;
  status: string;
  stage: string;
  group: string | null;
  homeTeam: { name: string | null };
  awayTeam: { name: string | null };
  score: {
    fullTime: { home: number | null; away: number | null };
  };
};

type LiveMatchState = 'LIVE' | 'HALF_TIME' | 'UPCOMING';

type LiveMatchResponse = {
  found: boolean;
  state?: LiveMatchState;
  home?: string;
  away?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  startDate?: string;
  stageLabel?: string;
  groupLabel?: string | null;
};

const IN_PROGRESS_STATUSES = new Set(['IN_PLAY', 'PAUSED']);
const UPCOMING_STATUSES = new Set(['TIMED', 'SCHEDULED']);

const STAGE_LABELS: Record<string, string> = {
  GROUP_STAGE: 'Phase de groupes',
  LAST_32: '16es de finale',
  LAST_16: '8es de finale',
  QUARTER_FINALS: 'Quarts de finale',
  SEMI_FINALS: 'Demi-finales',
  THIRD_PLACE: 'Petite finale',
  FINAL: 'Finale',
};

const toStageLabel = (stage: string): string => STAGE_LABELS[stage] ?? 'Coupe du Monde';

const toGroupLabel = (group: string | null): string | null => {
  if (!group || !group.startsWith('GROUP_')) {
    return null;
  }
  return `Groupe ${group.slice('GROUP_'.length)}`;
};

const byKickoffAsc =(a: FootballDataMatch, b: FootballDataMatch): number =>
  new Date(a.utcDate).getTime() - new Date(b.utcDate).getTime();

const handler = async (): Promise<LiveMatchResponse> => {
  const matches = await fetchWorldCupMatches<FootballDataMatch>();

  const playable = matches.filter((match) => match.homeTeam.name && match.awayTeam.name);

  const inProgress = playable
    .filter((match) => IN_PROGRESS_STATUSES.has(match.status))
    .sort(byKickoffAsc)[0];

  const now = Date.now();
  const upcoming = playable
    .filter(
      (match) =>
        UPCOMING_STATUSES.has(match.status) && new Date(match.utcDate).getTime() > now,
    )
    .sort(byKickoffAsc)[0];

  const selected = inProgress ?? upcoming;

  if (!selected) {
    return { found: false };
  }

  const state: LiveMatchState = inProgress
    ? selected.status === 'PAUSED'
      ? 'HALF_TIME'
      : 'LIVE'
    : 'UPCOMING';

  return {
    found: true,
    state,
    home: selected.homeTeam.name ?? '',
    away: selected.awayTeam.name ?? '',
    homeScore: state === 'UPCOMING' ? null : selected.score.fullTime.home,
    awayScore: state === 'UPCOMING' ? null : selected.score.fullTime.away,
    startDate: selected.utcDate,
    stageLabel: toStageLabel(selected.stage),
    groupLabel: toGroupLabel(selected.group),
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
