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

  it('ranks bettors by puntEV and exposes how lucky each one has been', () => {
    const todayMatch = { id: 'today', endDate: '2026-06-28T20:00:00Z', result: 'HOME_WIN' };
    const priorMatch = { id: 'prior', endDate: '2026-06-20T20:00:00Z', result: 'HOME_WIN' };

    const facts = buildRecapFacts(
      [match({ id: 'today' })],
      [
        // Alice : grosse chatte — 80 puntos réels pour seulement 10 espérés.
        bet({
          person: { id: 'p1', name: { firstName: 'Alice' } },
          puntos: 80,
          puntevs: 10,
          match: todayMatch,
        }),
        // Bob : poissard — 10 puntos réels alors qu'il en visait 50.
        bet({
          person: { id: 'p2', name: { firstName: 'Bob' } },
          puntos: 10,
          puntevs: 50,
          match: priorMatch,
        }),
      ],
      people,
      DAY_START,
    );

    // Sorted by expected (puntEV) rank: Bob expected more, so he leads the EV table.
    expect(facts.puntEvStandings.map((entry) => entry.name)).toEqual(['Bob', 'Alice']);

    const alice = facts.puntEvStandings.find((entry) => entry.name === 'Alice')!;
    expect(alice).toMatchObject({
      realRank: 1,
      evRank: 2,
      expected: 10,
      actual: 80,
      luck: 70,
      luckRankDelta: 1,
    });

    const bob = facts.puntEvStandings.find((entry) => entry.name === 'Bob')!;
    expect(bob).toMatchObject({ realRank: 2, evRank: 1, luck: -40, luckRankDelta: -1 });
  });

  it('groups World Cup winner bets with their jackpot and backers', () => {
    const winnerPeople: RecapPersonRecord[] = [
      { id: 'p1', name: { firstName: 'Alice' }, wcWinnerBet: 'France', victoryChance: 25 },
      { id: 'p2', name: { firstName: 'Bob' }, wcWinnerBet: 'France', victoryChance: 25 },
      { id: 'p3', name: { firstName: 'Chloé' }, wcWinnerBet: 'Brazil', victoryChance: 40 },
    ];

    const facts = buildRecapFacts([], [], winnerPeople, DAY_START);

    // Sorted by victory chance: Brazil (40%) before France (25%).
    expect(facts.winnerBets.map((entry) => entry.team)).toEqual(['Brazil', 'France']);

    const brazil = facts.winnerBets.find((entry) => entry.team === 'Brazil')!;
    // Single backer pockets the whole final pot: 170 * 8 / 1 = 1360.
    expect(brazil).toMatchObject({ puntosIfVictory: 1360, backers: ['Chloé'] });

    const france = facts.winnerBets.find((entry) => entry.team === 'France')!;
    // Two backers split the pot: 170 * 8 / 2 = 680 each.
    expect(france).toMatchObject({ puntosIfVictory: 680, backers: ['Alice', 'Bob'] });
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
  it('produces a markdown article with a title on a quiet day', () => {
    const facts = buildRecapFacts([], [], people, DAY_START);
    const copy = buildFallbackCopy(facts);

    // Single free-form markdown field, opening on a ## title.
    expect(copy.article.startsWith('## ')).toBe(true);
    expect(copy.article).toContain('blanche');
  });

  it('mentions the outsider in the markdown article', () => {
    const facts = buildRecapFacts(
      [match({ result: 'AWAY_WIN', score: '0-2', prematchAwayCote: 6.4 })],
      [],
      people,
      DAY_START,
    );
    const copy = buildFallbackCopy(facts);

    expect(copy.article).toContain('Brazil');
    expect(copy.article).toContain('6.4');
  });

  it('varies the article from one day to the next', () => {
    const sameFacts = (dayStart: number) =>
      buildRecapFacts(
        [match({ id: 'a' }), match({ id: 'b', result: 'AWAY_WIN', score: '0-2', prematchAwayCote: 6.4 })],
        [bet({ puntos: 30 })],
        people,
        dayStart,
      );

    const dayOne = buildFallbackCopy(sameFacts(DAY_START)).article;
    const dayTwo = buildFallbackCopy(sameFacts(DAY_START + 24 * 60 * 60 * 1000)).article;

    // Same shape of facts on two different dates must not read identically.
    expect(dayOne).not.toBe(dayTwo);
    // ...but regenerating the same day stays stable.
    expect(buildFallbackCopy(sameFacts(DAY_START)).article).toBe(dayOne);
  });

  it('surfaces the World Cup winner bet hopes in the article', () => {
    const facts = buildRecapFacts(
      [match()],
      [],
      [{ id: 'p1', name: { firstName: 'Alice' }, wcWinnerBet: 'France', victoryChance: 30 }],
      DAY_START,
    );
    const copy = buildFallbackCopy(facts);

    expect(copy.article).toContain('France');
    // 170 * 8 / 1 = 1360 puntos for a lone backer.
    expect(copy.article).toContain('1360');
  });
});
