import { MatchType } from 'src/objects/match.object';

export const MATCH_STAGE_MULTIPLIER: Record<MatchType, number> = {
  [MatchType.GROUP_STAGE]: 1,
  [MatchType.LAST_32]: 2,
  [MatchType.LAST_16]: 3,
  [MatchType.QUARTER_FINALS]: 4,
  [MatchType.SEMI_FINALS]: 5,
  [MatchType.THIRD_PLACE]: 6,
  [MatchType.FINAL]: 8,
};

export type PuntosBet = {
  id: string;
  betValue: string;
  won: boolean | null;
  match: { id: string | null; result: string | null; stage: string | null } | null;
};

export const getStageMultiplier = (stage: string | null): number =>
  MATCH_STAGE_MULTIPLIER[stage as MatchType] ?? 1;

export const computePuntos = (bet: PuntosBet, allBets: PuntosBet[]): number => {
  const result = bet.match?.result;

  if (!result || bet.betValue !== result) {
    return 0;
  }

  const matchBets = allBets.filter((other) => other.match?.id === bet.match?.id);
  const bettors = matchBets.length;
  const winners = matchBets.filter((other) => other.betValue === result).length;

  if (winners === 0) {
    return 0;
  }

  const pot = 10 * getStageMultiplier(bet.match?.stage ?? null) * bettors;

  return Math.round(pot / winners);
};
