import { describe, expect, it } from 'vitest';

import { selectCurrentMatch } from 'src/logic-functions/shared/current-match';

const NOW = Date.parse('2026-06-19T18:30:00Z');

const match = (overrides: Record<string, unknown> = {}) => ({
  home: 'France',
  away: 'Brazil',
  startDate: '2026-06-19T18:00:00Z',
  endDate: '2026-06-19T20:00:00Z',
  stage: 'GROUP_STAGE',
  ...overrides,
});

describe('selectCurrentMatch', () => {
  it('returns the in-progress match when now is within its window', () => {
    const selection = selectCurrentMatch([match()], NOW);

    expect(selection?.inProgress).toBe(true);
    expect(selection?.match.home).toBe('France');
  });

  it('falls back to a 3h window when endDate is missing', () => {
    const live = selectCurrentMatch(
      [match({ startDate: '2026-06-19T15:50:00Z', endDate: null })],
      NOW,
    );
    expect(live?.inProgress).toBe(true);

    const tooOld = selectCurrentMatch(
      [match({ startDate: '2026-06-19T14:00:00Z', endDate: null })],
      NOW,
    );
    expect(tooOld).toBeNull();
  });

  it('picks the earliest in-progress match when several overlap', () => {
    const selection = selectCurrentMatch(
      [
        match({ home: 'Later', startDate: '2026-06-19T18:15:00Z' }),
        match({ home: 'Earlier', startDate: '2026-06-19T18:00:00Z' }),
      ],
      NOW,
    );

    expect(selection?.match.home).toBe('Earlier');
  });

  it('returns the next upcoming match when none is in progress', () => {
    const selection = selectCurrentMatch(
      [
        match({ home: 'Soon', startDate: '2026-06-19T19:00:00Z', endDate: '2026-06-19T21:00:00Z' }),
        match({ home: 'Later', startDate: '2026-06-19T22:00:00Z', endDate: '2026-06-20T00:00:00Z' }),
      ],
      NOW,
    );

    expect(selection?.inProgress).toBe(false);
    expect(selection?.match.home).toBe('Soon');
  });

  it('returns null when there is no playable match', () => {
    expect(selectCurrentMatch([], NOW)).toBeNull();
    expect(
      selectCurrentMatch([match({ home: null }), match({ startDate: null })], NOW),
    ).toBeNull();
  });
});
