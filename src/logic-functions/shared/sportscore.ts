import { normalizeTeamName } from 'src/logic-functions/shared/api';

const SPORTSCORE_BASE_URL = 'https://sportscore.com/football/match';

const SPORTSCORE_SLUG_ALIASES: Record<string, string> = {
  korearepublic: 'south-korea',
  iriran: 'iran',
};

export type SportscoreState = 'LIVE' | 'HALF_TIME' | 'UPCOMING' | 'FINISHED';

export type SportscoreLiveMatch = {
  state: SportscoreState;
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
};

export const toSportscoreSlug = (teamName: string): string => {
  const alias = SPORTSCORE_SLUG_ALIASES[normalizeTeamName(teamName)];
  if (alias) {
    return alias;
  }

  return teamName
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/['’.]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
};

const toScore = (value: unknown): number | null =>
  typeof value === 'number' ? value : null;

export const parseSportscoreResponse = (payload: unknown): SportscoreLiveMatch | null => {
  if (typeof payload !== 'object' || payload === null) {
    return null;
  }

  const data = payload as {
    ok?: boolean;
    status?: {
      label?: string;
      is_live?: boolean;
      is_finished?: boolean;
      is_not_started?: boolean;
    };
    score?: { home?: unknown; away?: unknown };
    latest_events?: { minute?: unknown }[];
  };

  if (data.ok !== true || !data.status) {
    return null;
  }

  const { status } = data;

  const state: SportscoreState | null = status.is_not_started
    ? 'UPCOMING'
    : status.is_finished
      ? 'FINISHED'
      : status.label === 'HT'
        ? 'HALF_TIME'
        : status.is_live
          ? 'LIVE'
          : null;

  if (!state) {
    return null;
  }

  const latestMinute = data.latest_events?.[0]?.minute;

  return {
    state,
    homeScore: toScore(data.score?.home),
    awayScore: toScore(data.score?.away),
    minute: typeof latestMinute === 'number' ? latestMinute : null,
  };
};

const fetchSlug = async (slug: string): Promise<SportscoreLiveMatch | null> => {
  const response = await fetch(`${SPORTSCORE_BASE_URL}/${slug}/live/`, {
    redirect: 'manual',
  });

  if (response.status !== 200) {
    return null;
  }

  const payload = (await response.json()) as unknown;

  return parseSportscoreResponse(payload);
};

export const fetchSportscoreLiveMatch = async (
  home: string,
  away: string,
): Promise<SportscoreLiveMatch | null> => {
  const homeSlug = toSportscoreSlug(home);
  const awaySlug = toSportscoreSlug(away);

  const orderings = [`${homeSlug}-vs-${awaySlug}`, `${awaySlug}-vs-${homeSlug}`];

  for (const slug of orderings) {
    try {
      const result = await fetchSlug(slug);
      if (result) {
        return result;
      }
    } catch {
      continue;
    }
  }

  return null;
};
