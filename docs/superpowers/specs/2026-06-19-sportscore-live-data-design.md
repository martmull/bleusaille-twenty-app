# Sportscore live-data util with football-data fallback

## Problem

`api.football-data.org` (free tier) delivers live scores with too much delay. We want
fresher live data from sportscore.com for the currently-playing match, while keeping
football-data as the source of truth for everything else and as a fallback.

## Key findings (verified)

- `https://sportscore.com/football/match/<slug>/live/` returns **clean JSON** (not HTML),
  e.g. `qatar-vs-canada` → `200` with:

  ```json
  {
    "ok": true,
    "status": { "id": 8, "label": "FT", "is_live": false, "is_finished": true, "is_not_started": false },
    "score": { "home": 6, "away": 0, "home_halftime": 3, "away_halftime": 0 },
    "stats": { ... },
    "latest_events": [{ "minute": 92, "kind": "goal", "side": "home", "player": "Jonathan David" }, ...]
  }
  ```

- **Slug ordering matters.** `qatar-vs-canada` → `200`; the reversed `canada-vs-qatar` → `301`
  redirect to `/football/`. A non-existent match also `301`s to `/football/`.
  → **`301` / non-`200` / `ok:false` = "nothing" → fall back to football-data.**
  → We don't know sportscore's home/away convention, so **try both orderings**.

## Scope

Live match only. football-data keeps driving the fixture list, match selection,
stage/group/dates and `fetchOutcomes`. Sportscore overlays only the live score and state
of the already-selected, in-progress match in `live-match.ts`. Sportscore **never removes
a match**: when it reports FT, we still show the final score with the existing state machine.

## Component: `src/logic-functions/shared/sportscore.ts`

```ts
export type SportscoreLiveMatch = {
  state: 'LIVE' | 'HALF_TIME' | 'UPCOMING' | 'FINISHED';
  homeScore: number | null;
  awayScore: number | null;
  minute: number | null;
};

export const fetchSportscoreLiveMatch = (
  home: string,
  away: string,
): Promise<SportscoreLiveMatch | null>;
```

### Slug computation — `toSportscoreSlug(name: string): string`

- Lowercase, strip accents (NFD + remove diacritics), remove punctuation/apostrophes,
  collapse whitespace runs to single hyphens. `Qatar` → `qatar`, `United States` → `united-states`,
  `Côte d'Ivoire` → `cote-divoire`.
- A small `SPORTSCORE_ALIASES: Record<string, string>` maps football-data spellings to
  sportscore slugs where they diverge (e.g. `korearepublic` → `south-korea`, `iriran` → `iran`).
  Mirrors the existing `team-aliases.ts` pattern; keyed by the normalized name. Start minimal
  and extend as mismatches surface — a missed alias just yields a `301` and a clean fallback,
  never an error.

### Fetch & parse

1. Build `slugA = toSportscoreSlug(home) + '-vs-' + toSportscoreSlug(away)` and the reversed
   `slugB`. Try `slugA` then `slugB`.
2. `fetch(.../<slug>/live/, { redirect: 'manual' })`. Treat anything other than `200` with a
   JSON body containing `ok:true` as a miss → try the other ordering, then return `null`.
3. Map status → state:
   - `is_not_started` → `UPCOMING`
   - `is_finished` → `FINISHED`
   - `label === 'HT'` → `HALF_TIME`
   - else (`is_live`) → `LIVE`
4. `homeScore`/`awayScore` from `score.home` / `score.away` (nullable). `minute` from the latest
   event's `minute` (fallback `null`).
5. **Any network or parse error → return `null`** (never throw), so the caller always falls back.

## Integration: `src/logic-functions/live-match.ts`

After the match is selected and `state`/scores computed from football-data:

- If the selected match's football-data `state !== 'UPCOMING'`, call
  `fetchSportscoreLiveMatch(home, away)`.
- If it returns non-null:
  - Override `homeScore`/`awayScore` with sportscore's values when they are non-null.
  - Refine `state`: sportscore `HALF_TIME` → `HALF_TIME`, otherwise keep `LIVE`.
    Sportscore `FINISHED` → keep state `LIVE` and show the final score (decision: never drop
    the match early; football-data still controls when the match leaves the live window).
- If it returns `null`, keep football-data's values unchanged.

No change to selection, outcomes, stage/group labels, or the response shape.

## Out of scope (YAGNI)

- Detecting early kickoff from sportscore for an UPCOMING match (selection stays on
  football-data).
- Overlaying sportscore onto sync-matches / finished-matches / settle-bets.
- Surfacing scorers / stats / minute in the widget (the util exposes `minute`, but wiring it
  into the response/UI is a separate task).

## Testing

- Unit-test `toSportscoreSlug` and alias resolution (accents, multi-word, apostrophes, aliases),
  following the existing `*.unit-test.ts` pattern in `shared/`.
- Unit-test the status→state mapping and the "miss → null" behavior with mocked `fetch`.
