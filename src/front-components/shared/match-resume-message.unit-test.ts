import { describe, expect, it } from 'vitest';

import {
  buildMatchResumeMessage,
  EvolutionRow,
} from 'src/front-components/shared/match-resume-message';

const BASELINE = '2026-06-10T00:00:00.000Z';
const EARLIER = '2026-06-12T20:00:00.000Z';
const THIS_MATCH = '2026-06-15T20:00:00.000Z';

const evolutions: EvolutionRow[] = [
  { personId: 'a', firstName: 'Alice', points: 0, matchEndDate: BASELINE },
  { personId: 'a', firstName: 'Alice', points: 5, matchEndDate: EARLIER },
  { personId: 'a', firstName: 'Alice', points: 30, matchEndDate: THIS_MATCH },
  { personId: 'b', firstName: 'Bob', points: 0, matchEndDate: BASELINE },
  { personId: 'b', firstName: 'Bob', points: 20, matchEndDate: EARLIER },
];

describe('buildMatchResumeMessage', () => {
  it('renders header, winners, and leaderboard with rank deltas', () => {
    const message = buildMatchResumeMessage({
      match: { home: 'France', away: 'Germany', score: '2-1' },
      matchEndDate: THIS_MATCH,
      winners: [{ firstName: 'Alice', puntos: 30 }],
      evolutions,
    });

    expect(message).toBe(
      [
        '⚽ Terminé — France 2-1 Germany',
        '🏆 Gagnants (+30 puntos chacun) :',
        ' Alice',
        '',
        '📊 Classement',
        '1. Alice — 35  (*+1*)',
        '2. Bob   — 20  (*-1*)',
      ].join('\n'),
    );
  });

  it('shows "Aucun gagnant" when there are no winners', () => {
    const message = buildMatchResumeMessage({
      match: { home: 'France', away: 'Germany', score: '0-0' },
      matchEndDate: THIS_MATCH,
      winners: [],
      evolutions,
    });

    expect(message).toContain('🏆 Aucun gagnant');
    expect(message).not.toContain('chacun');
  });

  it('uses "=" for unchanged ranks and first name as tiebreak', () => {
    const flat: EvolutionRow[] = [
      { personId: 'a', firstName: 'Alice', points: 10, matchEndDate: BASELINE },
      { personId: 'a', firstName: 'Alice', points: 0, matchEndDate: THIS_MATCH },
      { personId: 'b', firstName: 'Bob', points: 10, matchEndDate: BASELINE },
      { personId: 'b', firstName: 'Bob', points: 0, matchEndDate: THIS_MATCH },
    ];

    const message = buildMatchResumeMessage({
      match: { home: 'A', away: 'B', score: '1-1' },
      matchEndDate: THIS_MATCH,
      winners: [],
      evolutions: flat,
    });

    expect(message).toContain('1. Alice — 10  (*=*)');
    expect(message).toContain('2. Bob   — 10  (*=*)');
  });
});
