import { PUNTOS_SHARED_PER_MATCH } from 'src/constants/tournament';
import { MATCH_STAGE_MULTIPLIER } from 'src/logic-functions/shared/compute-puntos';
import { MatchType } from 'src/objects/match.object';

export type WinnerBetPuntosEvInput = {
  // How many participants picked the same winning team as this person.
  predictorsForTeam: number;
  // Bookmaker-implied probability (%) that the picked team wins the World Cup.
  victoryChancePct: number | null;
};

/**
 * Puntos a person would win if their picked team actually wins the World Cup:
 *
 *   PUNTOS_SHARED_PER_MATCH * MATCH_STAGE_MULTIPLIER.FINAL / NB_PREDICTED_WELL
 */
export const computeWinnerBetPot = ({
  predictorsForTeam,
}: Pick<WinnerBetPuntosEvInput, 'predictorsForTeam'>): number | null => {
  if (predictorsForTeam <= 0) {
    return null;
  }

  return (PUNTOS_SHARED_PER_MATCH * MATCH_STAGE_MULTIPLIER[MatchType.FINAL]) / predictorsForTeam;
};

/**
 * Expected puntos a person would earn from their World Cup winner bet:
 * the pot weighted by the probability that the picked team actually wins.
 * Edit this function to tweak the formula.
 */
export const computeWinnerBetPuntosEv = ({
  predictorsForTeam,
  victoryChancePct,
}: WinnerBetPuntosEvInput): number | null => {
  const potIfTeamWins = computeWinnerBetPot({ predictorsForTeam });

  if (victoryChancePct === null || potIfTeamWins === null) {
    return null;
  }

  return Math.round(potIfTeamWins * (victoryChancePct / 100));
};
