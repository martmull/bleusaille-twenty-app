import { PUNTOS_SHARED_PER_MATCH } from 'src/constants/tournament';
import { round2 } from 'src/logic-functions/shared/api';

export type BetPuntevsInput = {
  // How many bettors share this bet's predicted outcome (includes this bet).
  winnersForPick: number;
  // Implied probability (0-1) of this bet's predicted outcome.
  pickProbability: number | null;
};

/**
 * Expected puntos for a bet using the flat shared pot (170) split across
 * everyone who picked the same outcome, weighted by the odds it happens:
 *
 *   probBetWin * 170 / nbBettorsOnThisBet
 *
 * Edit this function to tweak the formula.
 */
export const computeBetPuntevs = ({
  winnersForPick,
  pickProbability,
}: BetPuntevsInput): number | null => {
  if (pickProbability === null || winnersForPick === 0) {
    return null;
  }

  return round2(pickProbability * (PUNTOS_SHARED_PER_MATCH / winnersForPick));
};
