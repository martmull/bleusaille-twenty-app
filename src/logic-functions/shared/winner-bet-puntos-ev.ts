import { MATCH_STAGE_MULTIPLIER } from 'src/logic-functions/shared/compute-puntos';
import { MatchType } from 'src/objects/match.object';

// Base points shared in a winner pot (mirrors the per-match puntos rule).
export const WINNER_BET_BASE_POINTS = 10;

export type WinnerBetPuntosEvInput = {
  // Total number of Bleusaille participants.
  participantCount: number;
  // How many participants picked the same winning team as this person.
  predictorsForTeam: number;
  // Bookmaker-implied probability (%) that the picked team wins the World Cup.
  victoryChancePct: number | null;
};

/**
 * Puntos a person would win if their picked team actually wins the World Cup:
 *
 *   10 * MATCH_STAGE_MULTIPLIER.FINAL * NB_PARTICIPANT / NB_PREDICTED_WELL
 */
export const computeWinnerBetPot = ({
  participantCount,
  predictorsForTeam,
}: Pick<WinnerBetPuntosEvInput, 'participantCount' | 'predictorsForTeam'>): number | null => {
  if (predictorsForTeam <= 0) {
    return null;
  }

  return (
    (WINNER_BET_BASE_POINTS * MATCH_STAGE_MULTIPLIER[MatchType.FINAL] * participantCount) /
    predictorsForTeam
  );
};

/**
 * Expected puntos a person would earn from their World Cup winner bet:
 * the pot weighted by the probability that the picked team actually wins.
 * Edit this function to tweak the formula.
 */
export const computeWinnerBetPuntosEv = ({
  participantCount,
  predictorsForTeam,
  victoryChancePct,
}: WinnerBetPuntosEvInput): number | null => {
  const potIfTeamWins = computeWinnerBetPot({ participantCount, predictorsForTeam });

  if (victoryChancePct === null || potIfTeamWins === null) {
    return null;
  }

  return Math.round(potIfTeamWins * (victoryChancePct / 100));
};
