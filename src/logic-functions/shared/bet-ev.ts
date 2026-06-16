import { round2 } from 'src/logic-functions/shared/api';
import { getStageMultiplier } from 'src/logic-functions/shared/compute-puntos';

export const EV_BASE_POINTS = 10;

export type BetEvInput = {
  // Competition stage of the match (drives the pot multiplier).
  stage: string | null;
  // Total number of bets placed on the match.
  bettors: number;
  // How many bettors share this bet's predicted outcome (includes this bet).
  winnersForPick: number;
  // Live implied probability (0-1) of this bet's predicted outcome.
  pickProbability: number | null;
};

/**
 * Expected puntos for a bet: the pot (10 * stage multiplier * bettors) is split
 * across everyone who picked the same outcome, weighted by the live odds that
 * the picked outcome actually happens.
 * Edit this function to tweak the formula.
 */
export const computeBetEv = ({
  stage,
  bettors,
  winnersForPick,
  pickProbability,
}: BetEvInput): number | null => {
  if (pickProbability === null || bettors === 0 || winnersForPick === 0) {
    return null;
  }

  const pot = EV_BASE_POINTS * getStageMultiplier(stage) * bettors;

  return round2(pickProbability * (pot / winnersForPick));
};
