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
 * Expected puntos a person would earn from their World Cup winner bet:
 *
 *   10 * MATCH_STAGE_MULTIPLIER.FINAL * NB_PARTICIPANT / NB_PREDICTED_WELL
 *
 * weighted by the probability that the picked team actually wins.
 * Edit this function to tweak the formula.
 */
export const computeWinnerBetPuntosEv = ({
  participantCount,
  predictorsForTeam,
  victoryChancePct,
}: WinnerBetPuntosEvInput): number | null => {
  if (victoryChancePct === null || predictorsForTeam <= 0) {
    return null;
  }

  const potIfTeamWins =
    (WINNER_BET_BASE_POINTS * MATCH_STAGE_MULTIPLIER[MatchType.FINAL] * participantCount) /
    predictorsForTeam;

  const expectedPuntos = potIfTeamWins * (victoryChancePct / 100);

  return Math.round(expectedPuntos);
};
