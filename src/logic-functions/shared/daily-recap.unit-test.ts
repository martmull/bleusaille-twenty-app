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

  it('flags only genuine underdog team wins, not draws or favourites', () => {
    const facts = buildRecapFacts(
      [
        match({
          id: 'upset',
          result: 'AWAY_WIN',
          score: '0-2',
          prematchAwayCote: 6.4,
        }),
        match({ id: 'favourite', result: 'HOME_WIN', prematchHomeCote: 1.4 }),
        match({
          id: 'high-cote-draw',
          result: 'NULL_OR_DRAW',
          score: '0-0',
          prematchDrawCote: 4.1,
        }),
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

  it('reports the current ongoing win and loss streaks', () => {
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

    expect(facts.currentWinStreak).toEqual({ name: 'Alice', length: 3 });
    expect(facts.currentLossStreak).toEqual({ name: 'Bob', length: 2 });
  });

  it('uses the trailing run, not the season record (a loss resets the streak)', () => {
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
        bet({ won: false, match: dated(13, 'HOME_WIN') }),
        bet({ won: true, match: dated(14, 'HOME_WIN') }),
        bet({
          won: true,
          person: { id: 'p2', name: { firstName: 'Bob' } },
          match: dated(13, 'HOME_WIN'),
        }),
        bet({
          won: true,
          person: { id: 'p2', name: { firstName: 'Bob' } },
          match: dated(14, 'HOME_WIN'),
        }),
      ],
      people,
      DAY_START,
    );

    expect(facts.currentWinStreak).toEqual({ name: 'Bob', length: 2 });
  });

  it('only counts streaks settled up to the recapped day (backfill snapshot)', () => {
    const dated = (day: number, result: string) => ({
      id: `m${day}`,
      endDate: `2026-06-${String(day).padStart(2, '0')}T20:00:00Z`,
      result,
    });

    const allBets = [
      bet({ won: true, match: dated(10, 'HOME_WIN') }),
      bet({ won: true, match: dated(11, 'HOME_WIN') }),
      bet({ won: true, match: dated(12, 'HOME_WIN') }),
    ];

    const onJune11 = buildRecapFacts(
      [],
      allBets,
      people,
      Date.parse('2026-06-11T00:00:00Z'),
    );
    const onJune12 = buildRecapFacts(
      [],
      allBets,
      people,
      Date.parse('2026-06-12T00:00:00Z'),
    );

    expect(onJune11.currentWinStreak).toEqual({ name: 'Alice', length: 2 });
    expect(onJune12.currentWinStreak).toEqual({ name: 'Alice', length: 3 });
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
