import { describe, expect, it } from 'vitest';

import { pickWeightedOutcome } from 'src/logic-functions/shared/random-prediction';
import { BetValue } from 'src/objects/bet.object';

const probs = { home: 50, draw: 30, away: 20 };

describe('pickWeightedOutcome', () => {
  it('returns HOME_WIN at the bottom of the range', () => {
    expect(pickWeightedOutcome(probs, () => 0)).toBe(BetValue.HOME_WIN);
  });

  it('returns HOME_WIN just below the home boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.49)).toBe(BetValue.HOME_WIN);
  });

  it('returns NULL_OR_DRAW just above the home boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.51)).toBe(BetValue.NULL_OR_DRAW);
  });

  it('returns NULL_OR_DRAW just below the draw boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.79)).toBe(BetValue.NULL_OR_DRAW);
  });

  it('returns AWAY_WIN just above the draw boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.81)).toBe(BetValue.AWAY_WIN);
  });

  it('returns AWAY_WIN near the top of the range', () => {
    expect(pickWeightedOutcome(probs, () => 0.999)).toBe(BetValue.AWAY_WIN);
  });

  it('never selects a zero-weight outcome', () => {
    const noDraw = { home: 50, draw: 0, away: 50 };
    expect(pickWeightedOutcome(noDraw, () => 0.5)).toBe(BetValue.AWAY_WIN);
    expect(pickWeightedOutcome(noDraw, () => 0.499)).toBe(BetValue.HOME_WIN);
  });
});
