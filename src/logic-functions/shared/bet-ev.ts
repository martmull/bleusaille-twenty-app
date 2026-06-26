import { PUNTOS_SHARED_PER_MATCH } from 'src/constants/tournament';
import { round2 } from 'src/logic-functions/shared/api';
import { getStageMultiplier } from 'src/logic-functions/shared/compute-puntos';

export type BetEvInput = {
  // Competition stage of the match (drives the pot multiplier).
  stage: string | null;
  // How many bettors share this bet's predicted outcome (includes this bet).
  winnersForPick: number;
  // Live implied probability (0-1) of this bet's predicted outcome.
  pickProbability: number | null;
};

/**
 * Expected puntos for a bet: the pot (PUNTOS_SHARED_PER_MATCH * stage
 * multiplier) is split across everyone who picked the same outcome, weighted by
 * the live odds that the picked outcome actually happens.
 * Edit this function to tweak the formula.
 */
export const computeBetEv = ({
  stage,
  winnersForPick,
  pickProbability,
}: BetEvInput): number | null => {
  if (pickProbability === null || winnersForPick === 0) {
    return null;
  }

  const pot = PUNTOS_SHARED_PER_MATCH * getStageMultiplier(stage);

  return round2(pickProbability * (pot / winnersForPick));
};
