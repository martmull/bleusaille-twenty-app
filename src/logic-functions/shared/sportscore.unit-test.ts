import { describe, expect, it } from 'vitest';

import {
  parseSportscoreResponse,
  toSportscoreSlug,
} from 'src/logic-functions/shared/sportscore';

describe('toSportscoreSlug', () => {
  it('lowercases a single-word name', () => {
    expect(toSportscoreSlug('Qatar')).toBe('qatar');
  });

  it('hyphenates a multi-word name', () => {
    expect(toSportscoreSlug('United States')).toBe('united-states');
  });

  it('strips accents and apostrophes', () => {
    expect(toSportscoreSlug("Côte d'Ivoire")).toBe('cote-divoire');
  });

  it('maps football-data spellings via aliases', () => {
    expect(toSportscoreSlug('Korea Republic')).toBe('south-korea');
    expect(toSportscoreSlug('IR Iran')).toBe('iran');
  });
});

describe('parseSportscoreResponse', () => {
  it('returns null when the payload is not ok', () => {
    expect(parseSportscoreResponse({ ok: false })).toBeNull();
  });

  it('returns null for a non-object payload', () => {
    expect(parseSportscoreResponse(null)).toBeNull();
  });

  it('maps a finished match to FINISHED with its score', () => {
    const result = parseSportscoreResponse({
      ok: true,
      status: { label: 'FT', is_live: false, is_finished: true, is_not_started: false },
      score: { home: 6, away: 0 },
      latest_events: [{ minute: 92 }],
    });

    expect(result).toEqual({
      state: 'FINISHED',
      homeScore: 6,
      awayScore: 0,
      minute: 92,
    });
  });

  it('maps a half-time match to HALF_TIME', () => {
    const result = parseSportscoreResponse({
      ok: true,
      status: { label: 'HT', is_live: true, is_finished: false, is_not_started: false },
      score: { home: 1, away: 1 },
      latest_events: [],
    });

    expect(result?.state).toBe('HALF_TIME');
  });

  it('maps an in-play match to LIVE and preserves a 0-0 score', () => {
    const result = parseSportscoreResponse({
      ok: true,
      status: { label: "1'", is_live: true, is_finished: false, is_not_started: false },
      score: { home: 0, away: 0 },
      latest_events: [],
    });

    expect(result).toEqual({
      state: 'LIVE',
      homeScore: 0,
      awayScore: 0,
      minute: null,
    });
  });

  it('maps a not-started match to UPCOMING', () => {
    const result = parseSportscoreResponse({
      ok: true,
      status: { label: '', is_live: false, is_finished: false, is_not_started: true },
      score: {},
      latest_events: [],
    });

    expect(result).toEqual({
      state: 'UPCOMING',
      homeScore: null,
      awayScore: null,
      minute: null,
    });
  });
});
