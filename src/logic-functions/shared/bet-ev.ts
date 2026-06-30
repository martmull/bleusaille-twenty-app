import { PUNTOS_SHARED_PER_MATCH } from 'src/constants/tournament';

export type BetPuntevsInput = {
  // How many bettors share this bet's predicted outcome (includes this bet).
  winnersForPick: number;
  // Implied probability (0-1) of this bet's predicted outcome.
  pickProbability: number | null;
  // Stage multiplier applied to the shared pot (knockout rounds are worth more
  // than the group stage). 1 for pool matches.
  stageMultiplier: number;
};

/**
 * Expected puntos for a bet: the payout a winner on this pick would collect (the
 * stage-scaled shared pot split across everyone who picked the same outcome),
 * weighted by the odds the outcome happens:
 *
 *   pickProbability * (170 * stageMultiplier) / nbBettorsOnThisPick
 *
 * Edit this function to tweak the formula.
 */
export const computeBetPuntevs = ({
  winnersForPick,
  pickProbability,
  stageMultiplier,
}: BetPuntevsInput): number | null => {
  if (pickProbability === null || winnersForPick === 0) {
    return null;
  }

  return pickProbability * ((PUNTOS_SHARED_PER_MATCH * stageMultiplier) / winnersForPick);
};
