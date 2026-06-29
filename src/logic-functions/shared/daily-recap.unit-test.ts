import { describe, expect, it } from 'vitest';

import {
  buildFallbackCopy,
  buildRecapFacts,
  RecapBetRecord,
  RecapMatchRecord,
  RecapPersonRecord,
} from 'src/logic-functions/shared/daily-recap';

const DAY_START = Date.parse('2026-06-28T00:00:00Z');

const people: RecapPersonRecord[] = [
  { id: 'p1', name: { firstName: 'Alice' } },
  { id: 'p2', name: { firstName: 'Bob' } },
];

const match = (overrides: Partial<RecapMatchRecord> = {}): RecapMatchRecord => ({
  id: 'm',
  home: 'France',
  away: 'Brazil',
  score: '1-0',
  result: 'HOME_WIN',
  endDate: '2026-06-28T20:00:00Z',
  prematchHomeCote: 1.5,
  prematchDrawCote: 3.5,
  prematchAwayCote: 5,
  ...overrides,
});

const bet = (overrides: Partial<RecapBetRecord> = {}): RecapBetRecord => ({
  won: true,
  puntos: 10,
  person: { id: 'p1', name: { firstName: 'Alice' } },
  match: { id: 'm', endDate: '2026-06-28T20:00:00Z', result: 'HOME_WIN' },
  ...overrides,
});

describe('buildRecapFacts', () => {
  it('keeps only matches finished within the recap day', () => {
    const facts = buildRecapFacts(
      [
        match({ id: 'today' }),
        match({ id: 'earlier', endDate: '2026-06-27T20:00:00Z' }),
      ],
      [],
      people,
      DAY_START,
    );

    expect(facts.matches).toHaveLength(1);
    expect(facts.matches[0].label).toBe('France - Brazil');
    expect(facts.matches[0].winner).toBe('France');
  });

  it('flags an outsider win when the winning prematch cote is high', () => {
    const facts = buildRecapFacts(
      [
        match({
          id: 'upset',
          result: 'AWAY_WIN',
          score: '0-2',
          prematchAwayCote: 6.4,
        }),
        match({ id: 'favourite', result: 'HOME_WIN', prematchHomeCote: 1.4 }),
      ],
      [],
      people,
      DAY_START,
    );

    expect(facts.outsiderWins).toHaveLength(1);
    expect(facts.outsiderWins[0].winner).toBe('Brazil');
    expect(facts.outsiderWins[0].cote).toBe(6.4);
  });

  it('computes ranking moves from puntos earned on the recap day', () => {
    const priorMatch = { id: 'prior', endDate: '2026-06-20T20:00:00Z', result: 'HOME_WIN' };
    const todayMatch = { id: 'today', endDate: '2026-06-28T20:00:00Z', result: 'HOME_WIN' };

    const facts = buildRecapFacts(
      [match({ id: 'today' })],
      [
        bet({ person: { id: 'p2', name: { firstName: 'Bob' } }, puntos: 50, match: priorMatch }),
        bet({ person: { id: 'p1', name: { firstName: 'Alice' } }, puntos: 80, match: todayMatch }),
      ],
      people,
      DAY_START,
    );

    const alice = facts.rankingMoves.find((move) => move.name === 'Alice');
    expect(alice).toEqual({ name: 'Alice', from: 2, to: 1, delta: 1 });
  });

  it('reports the longest win and loss streaks across all bets', () => {
    const dated = (day: number, result: string) => ({
      id: `m${day}`,
      endDate: `2026-06-${String(day).padStart(2, '0')}T20:00:00Z`,
      result,
    });

    const facts = buildRecapFacts(
      [],
      [
        bet({ won: true, match: dated(10, 'HOME_WIN') }),
        bet({ won: true, match: dated(11, 'HOME_WIN') }),
        bet({ won: true, match: dated(12, 'HOME_WIN') }),
        bet({
          won: false,
          person: { id: 'p2', name: { firstName: 'Bob' } },
          match: dated(10, 'HOME_WIN'),
        }),
        bet({
          won: false,
          person: { id: 'p2', name: { firstName: 'Bob' } },
          match: dated(11, 'HOME_WIN'),
        }),
      ],
      people,
      DAY_START,
    );

    expect(facts.longestWinStreak).toEqual({ name: 'Alice', length: 3 });
    expect(facts.longestLossStreak).toEqual({ name: 'Bob', length: 2 });
  });
});

describe('buildFallbackCopy', () => {
  it('produces a quiet-day copy when nothing happened', () => {
    const facts = buildRecapFacts([], [], people, DAY_START);
    const copy = buildFallbackCopy(facts);

    expect(copy.mood).toBe('😴');
    expect(copy.headline).toContain('blanche');
  });

  it('mentions the outsider in the notable results', () => {
    const facts = buildRecapFacts(
      [match({ result: 'AWAY_WIN', score: '0-2', prematchAwayCote: 6.4 })],
      [],
      people,
      DAY_START,
    );
    const copy = buildFallbackCopy(facts);

    expect(copy.notableResults).toContain('Brazil');
    expect(copy.notableResults).toContain('6.4');
  });
});
