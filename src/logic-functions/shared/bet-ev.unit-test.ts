import { describe, expect, it } from 'vitest';

import { computeBetPuntevs } from 'src/logic-functions/shared/bet-ev';
import { prematchPickProbability } from 'src/logic-functions/shared/steps/compute-puntos.step';
import { BetValue } from 'src/objects/bet.object';
import { MatchType } from 'src/objects/match.object';

const poolMatch = {
  id: 'match-pool',
  result: 'HOME_WIN',
  stage: MatchType.GROUP_STAGE,
  prematchHomeCote: 2,
  prematchDrawCote: 4,
  prematchAwayCote: 4,
};

// Knockout matches are priced on the two-way draw-no-bet market, so the draw
// cote is never persisted.
const knockoutMatch = {
  id: 'match-knockout',
  result: 'HOME_WIN',
  stage: MatchType.QUARTER_FINALS,
  prematchHomeCote: 2,
  prematchDrawCote: null,
  prematchAwayCote: 2,
};

describe('prematchPickProbability', () => {
  it('normalises three-way cotes for pool matches', () => {
    // Inverses: 0.5 / 0.25 / 0.25, total 1 -> already de-vigged here.
    expect(prematchPickProbability(BetValue.HOME_WIN, poolMatch)).toBeCloseTo(0.5);
    expect(prematchPickProbability(BetValue.NULL_OR_DRAW, poolMatch)).toBeCloseTo(0.25);
    expect(prematchPickProbability(BetValue.AWAY_WIN, poolMatch)).toBeCloseTo(0.25);
  });

  it('computes a two-way probability for non-pool matches with no draw cote', () => {
    // This is the regression: previously a missing draw cote returned null and
    // left the bet without puntevs.
    expect(prematchPickProbability(BetValue.HOME_WIN, knockoutMatch)).toBeCloseTo(0.5);
    expect(prematchPickProbability(BetValue.AWAY_WIN, knockoutMatch)).toBeCloseTo(0.5);
    // A draw cannot be priced on the two-way market, so it carries no
    // probability rather than blocking the whole computation.
    expect(prematchPickProbability(BetValue.NULL_OR_DRAW, knockoutMatch)).toBe(0);
  });

  it('still returns null when a winner cote is missing', () => {
    expect(
      prematchPickProbability(BetValue.HOME_WIN, { ...knockoutMatch, prematchHomeCote: null }),
    ).toBeNull();
  });
});

describe('computeBetPuntevs', () => {
  it('scales the shared pot by the stage multiplier', () => {
    // Quarter-finals multiplier is 4, pot = 170 * 4 = 680.
    expect(
      computeBetPuntevs({ winnersForPick: 2, pickProbability: 0.5, stageMultiplier: 4 }),
    ).toBeCloseTo((0.5 * 680) / 2);
  });

  it('matches the flat pot for pool matches (multiplier 1)', () => {
    expect(
      computeBetPuntevs({ winnersForPick: 4, pickProbability: 0.5, stageMultiplier: 1 }),
    ).toBeCloseTo((0.5 * 170) / 4);
  });

  it('returns null without a probability or any bettors on the pick', () => {
    expect(
      computeBetPuntevs({ winnersForPick: 2, pickProbability: null, stageMultiplier: 4 }),
    ).toBeNull();
    expect(
      computeBetPuntevs({ winnersForPick: 0, pickProbability: 0.5, stageMultiplier: 4 }),
    ).toBeNull();
  });
});
