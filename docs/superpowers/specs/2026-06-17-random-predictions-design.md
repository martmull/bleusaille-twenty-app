# Random Predictions Logic Function — Design

## Goal

Add a logic function that pulls live odds for the next upcoming match(es) and
returns a randomized result prediction for each, weighted by the bookmaker
implied probabilities. It returns JSON only — it does not create any `Bet`
records.

## Trigger & Input

- New logic function: `src/logic-functions/random-predictions.ts`.
- HTTP GET route trigger at `/random-predictions`, `isAuthRequired: false`,
  matching the existing `live-match` and `compute-ev` functions so it is
  directly callable.
- Input: `count` query string parameter (`?count=N`).
  - Parsed as a positive integer.
  - Defaults to `1` when absent, empty, non-numeric, or `< 1`.

## Data Sources

- Live odds: `fetchMatchResultChances()` from
  `src/logic-functions/shared/odds.ts`. Returns a
  `Map<pairKey, MatchResultChances>` keyed by the unordered canonical team pair,
  where `MatchResultChances` already contains margin-normalized implied
  probabilities (`drawProbability`, `teamProbabilities`) and decimal prices
  (`drawPrice`, `teamPrices`).
- Matches: queried from the core API via `fetchAllPages` selecting
  `id, name, home, away, startDate`.

## Handler Flow

1. Parse `count` from `event.queryStringParameters` (default `1`).
2. `fetchMatchResultChances()` to get live odds.
3. Fetch all matches (`id, name, home, away, startDate`).
4. Keep matches whose `startDate` is in the future (`new Date(startDate) > now`),
   sorted by `startDate` ascending.
5. For each, look up chances via `teamPairKey(home, away)`. Keep only matches
   that have live odds. Take the first `count`.
6. For each kept match, derive the three outcome probabilities and prices:
   - home: `teamProbabilities.get(canonicalTeamName(home))`,
     `teamPrices.get(canonicalTeamName(home))`
   - away: `teamProbabilities.get(canonicalTeamName(away))`,
     `teamPrices.get(canonicalTeamName(away))`
   - draw: `drawProbability`, `drawPrice`
7. Pick an outcome with `pickWeightedOutcome` (see below), weighted by the three
   probabilities.
8. Return JSON.

If fewer than `count` upcoming matches have live odds, return as many as
qualify; the response `count` reflects the actual number returned.

## Weighted Pick Helper

Extracted as a pure, unit-testable function in
`src/logic-functions/shared/random-prediction.ts`:

```
pickWeightedOutcome(
  probabilities: { home: number; draw: number; away: number },
  random: () => number = Math.random,
): BetValue
```

- Builds cumulative weights over `[home, draw, away]` and returns the matching
  `BetValue` (`HOME_WIN`, `NULL_OR_DRAW`, `AWAY_WIN`).
- `random` is injectable so the unit test can assert deterministic outcomes
  across the weight boundaries.
- Weights are used as-is; they need not sum exactly to 1 (the helper normalizes
  by the total of the three provided weights).

## Output Shape

```json
{
  "count": 1,
  "predictions": [
    {
      "matchId": "...",
      "name": "...",
      "home": "France",
      "away": "Brazil",
      "startDate": "2026-06-18T19:00:00Z",
      "quotes": { "home": 2.1, "draw": 3.4, "away": 3.0 },
      "probabilities": { "home": 47.6, "draw": 29.4, "away": 23.0 },
      "prediction": "HOME_WIN",
      "label": "1"
    }
  ]
}
```

- `prediction` is a `BetValue` enum value.
- `label` is the corresponding select label (`'1'` home, `'0'` draw, `'2'`
  away), matching the `Bet.betValue` option labels.
- `probabilities` are percentages rounded to one decimal (consistent with
  `odds.ts`); `quotes` are decimal prices rounded via `round2`.

## Testing

- Unit test `src/logic-functions/shared/random-prediction.unit-test.ts` for
  `pickWeightedOutcome`, following the existing `*.unit-test.ts` convention:
  - RNG at `0` → first non-zero-weight outcome.
  - RNG just below/above each cumulative boundary → expected outcome.
  - RNG near `1` → last outcome.
  - A zero-weight outcome is never selected.

## Out of Scope

- Creating or persisting `Bet` records.
- Attaching predictions to any `Person`.
- Storing quotes on `Match` records (handled separately by `updateMatchQuotes`).
