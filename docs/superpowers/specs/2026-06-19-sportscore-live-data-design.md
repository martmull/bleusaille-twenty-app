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

Live match only. Sportscore is the **primary** live source; football-data is a fallback.

**Architecture (revised):**
- **Match selection comes from the DB** (`Match` objects: `home`/`away`/`startDate`/`endDate`/
  `stage`), not football-data — so sportscore can be queried *before* football-data is touched.
  `selectCurrentMatch` (pure, unit-tested) picks the in-progress match (now within
  `startDate`..`endDate`, falling back to a 3h window) or the next upcoming one.
- **Live score/state for an in-progress match:** try sportscore first; only if sportscore
  returns `null` do we call football-data. Sportscore is authoritative when present (incl.
  `UPCOMING`/`FINISHED`). `FINISHED` → show the final score with state `LIVE` (never drop a
  match early).
- **The live-score call and the odds call are separate logic functions** (`live-match` and
  `match-odds`), polled independently by the front component.
- `group` is not stored in the DB, so the group sub-label is dropped (minor); `stage` uses the
  same enum strings football-data used, so the French stage labels are unchanged.

### CORS: sportscore must stay server-side

sportscore.com returns the JSON but sends **no `Access-Control-Allow-Origin` header**, so a
browser `fetch` from the front component is blocked. The front therefore cannot call sportscore
directly; a thin server-side `live-match` logic function proxies it (server-side fetch is not
subject to CORS).

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

## Logic functions

### `src/logic-functions/live-match.ts` (lightweight)

1. Query DB `Match` records, `selectCurrentMatch(matches, Date.now())`.
2. If in-progress, `fetchLiveScore(home, away)`:
   - `fetchSportscoreLiveMatch` first; if non-null, map state (`HALF_TIME`→`HALF_TIME`,
     `UPCOMING`→`UPCOMING`, `LIVE`/`FINISHED`→`LIVE`), `dataSource: 'sportscore'`.
   - Else `fetchFootballDataLive`: find the WC match by `teamPairKey`; if status is
     `IN_PLAY`/`PAUSED`, return its score/state with `dataSource: 'football-data'`, else `null`.
3. Response: `{ found, state, home, away, homeScore, awayScore, startDate, stageLabel,
   dataSource }`. No outcomes.

### `src/logic-functions/match-odds.ts` (new)

Holds the former `fetchOutcomes` computation. Reads `home`/`away` from
`event.queryStringParameters` and returns `{ found, outcomes }`.

## Front: `src/front-components/live-match.tsx`

- Two independent calls: `/s/live-match` (fast poll: 30s running / 120s idle) and
  `/s/match-odds?home=&away=` (fetched when the selected match changes and on manual refresh).
- `dataSource` is shown in the footer ("notification message"): ` · sportscore` /
  ` · football-data` next to the refresh age.

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
