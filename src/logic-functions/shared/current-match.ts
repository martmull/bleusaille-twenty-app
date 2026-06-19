const MAX_MATCH_DURATION_MS = 3 * 60 * 60 * 1000;

export type SelectableMatch = {
  home: string | null;
  away: string | null;
  startDate: string | null;
  endDate?: string | null;
};

export type CurrentMatchSelection<T> = {
  match: T;
  inProgress: boolean;
};

export const selectCurrentMatch = <T extends SelectableMatch>(
  matches: T[],
  nowMs: number,
): CurrentMatchSelection<T> | null => {
  const playable = matches.filter((match) => match.home && match.away && match.startDate);

  const startMs = (match: T): number => new Date(match.startDate!).getTime();
  const endMs = (match: T): number =>
    match.endDate ? new Date(match.endDate).getTime() : startMs(match) + MAX_MATCH_DURATION_MS;

  const byStartAsc = (a: T, b: T): number => startMs(a) - startMs(b);

  const inProgress = playable
    .filter((match) => startMs(match) <= nowMs && nowMs <= endMs(match))
    .sort(byStartAsc)[0];

  if (inProgress) {
    return { match: inProgress, inProgress: true };
  }

  const upcoming = playable
    .filter((match) => startMs(match) > nowMs)
    .sort(byStartAsc)[0];

  return upcoming ? { match: upcoming, inProgress: false } : null;
};
