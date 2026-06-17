import { BetValue } from 'src/objects/bet.object';

export type OutcomeProbabilities = {
  home: number;
  draw: number;
  away: number;
};

export const pickWeightedOutcome = (
  probabilities: OutcomeProbabilities,
  random: () => number = Math.random,
): BetValue => {
  const weights: Array<{ value: BetValue; weight: number }> = [
    { value: BetValue.HOME_WIN, weight: Math.max(probabilities.home, 0) },
    { value: BetValue.NULL_OR_DRAW, weight: Math.max(probabilities.draw, 0) },
    { value: BetValue.AWAY_WIN, weight: Math.max(probabilities.away, 0) },
  ];

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);

  if (total <= 0) {
    return BetValue.NULL_OR_DRAW;
  }

  const threshold = random() * total;

  let cumulative = 0;
  for (const entry of weights) {
    cumulative += entry.weight;
    if (threshold < cumulative) {
      return entry.value;
    }
  }

  return weights[weights.length - 1].value;
};
