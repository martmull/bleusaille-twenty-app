import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';
import { teamPairKey } from 'src/logic-functions/shared/team-aliases';
import { BetValue } from 'src/objects/bet.object';

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

type BetRecord = {
  betValue: string;
  ev: number | null;
  person: { name: { firstName: string | null } | null } | null;
  match: { home: string | null; away: string | null } | null;
};

type OutcomeBets = {
  ev: number | null;
  users: string[];
};

type Outcomes = {
  home: OutcomeBets;
  draw: OutcomeBets;
  away: OutcomeBets;
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
  outcomes?: Outcomes;
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

const groupOutcome = (bets: BetRecord[], betValue: BetValue): OutcomeBets => {
  const outcomeBets = bets.filter((bet) => bet.betValue === betValue);

  const ev = outcomeBets.find((bet) => bet.ev !== null)?.ev ?? null;
  const users = outcomeBets
    .map((bet) => bet.person?.name?.firstName)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b));

  return { ev, users };
};

const fetchOutcomes = async (match: FootballDataMatch): Promise<Outcomes | undefined> => {
  const livePairKey = teamPairKey(match.homeTeam.name!, match.awayTeam.name!);

  const client = createCoreApiClient();

  const bets = await fetchAllPages<BetRecord>(async (after) => {
    const { bets: page } = await client.query({
      bets: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: {
            betValue: true,
            ev: true,
            person: { name: { firstName: true } },
            match: { home: true, away: true },
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const matchBets = bets.filter(
    (bet) =>
      bet.match?.home &&
      bet.match?.away &&
      teamPairKey(bet.match.home, bet.match.away) === livePairKey,
  );

  if (matchBets.length === 0) {
    return undefined;
  }

  return {
    home: groupOutcome(matchBets, BetValue.HOME_WIN),
    draw: groupOutcome(matchBets, BetValue.NULL_OR_DRAW),
    away: groupOutcome(matchBets, BetValue.AWAY_WIN),
  };
};

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

  const outcomes = inProgress ? await fetchOutcomes(inProgress) : undefined;

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
    outcomes,
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
