import { describe, expect, it } from 'vitest';

import { toResult, type FootballDataMatch } from 'src/logic-functions/shared/steps/sync-matches.step';
import { MatchResult } from 'src/objects/match.object';

const match = (score: Partial<FootballDataMatch['score']>, status = 'FINISHED'): FootballDataMatch => ({
  utcDate: '2026-06-30T01:00:00Z',
  status,
  stage: 'LAST_32',
  homeTeam: { name: 'Netherlands' },
  awayTeam: { name: 'Morocco' },
  score: {
    winner: null,
    duration: 'REGULAR',
    fullTime: { home: null, away: null },
    ...score,
  },
});

describe('toResult', () => {
  it('maps an explicit home/away/draw winner', () => {
    expect(toResult(match({ winner: 'HOME_TEAM' }))).toBe(MatchResult.HOME_WIN);
    expect(toResult(match({ winner: 'AWAY_TEAM' }))).toBe(MatchResult.AWAY_WIN);
    expect(toResult(match({ winner: 'DRAW' }))).toBe(MatchResult.NULL_OR_DRAW);
  });

  it('returns null when the match is not finished', () => {
    expect(toResult(match({ winner: 'HOME_TEAM' }, 'IN_PLAY'))).toBeNull();
  });

  it('infers the result from the full-time score when winner is null (penalty shootout)', () => {
    expect(
      toResult(
        match({
          winner: null,
          duration: 'PENALTY_SHOOTOUT',
          fullTime: { home: 3, away: 4 },
        }),
      ),
    ).toBe(MatchResult.AWAY_WIN);

    expect(
      toResult(
        match({
          winner: null,
          duration: 'PENALTY_SHOOTOUT',
          fullTime: { home: 5, away: 4 },
        }),
      ),
    ).toBe(MatchResult.HOME_WIN);
  });

  it('returns null when finished but the full-time score is unavailable', () => {
    expect(toResult(match({ winner: null, fullTime: { home: null, away: null } }))).toBeNull();
  });
});
