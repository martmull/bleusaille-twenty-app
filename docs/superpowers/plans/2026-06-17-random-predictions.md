# Random Predictions Logic Function Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a logic function that pulls live odds for the next N upcoming matches and returns a randomized result prediction per match, weighted by the bookmaker implied probabilities — JSON only, no records created.

**Architecture:** A pure, unit-tested weighted-pick helper in `shared/`, consumed by a new HTTP-route logic function that fetches live odds (`fetchMatchResultChances`), pairs them with upcoming matches from the core API, and returns the predictions as JSON.

**Tech Stack:** TypeScript, Twenty SDK (`twenty-sdk/define`, `twenty-client-sdk/core`), Vitest unit tests, oxlint.

## Global Constraints

- All generated UUIDs must be valid UUID v4.
- No comments in code (project + user style) unless required by convention.
- Use existing type guards / helpers where they exist; minimal, focused changes only.
- Unit tests use the `*.unit-test.ts` suffix and run via `yarn test:unit`.
- Reuse existing shared helpers: `fetchMatchResultChances`/`MatchResultChances` (`shared/odds.ts`), `canonicalTeamName`/`teamPairKey` (`shared/team-aliases.ts`), `fetchAllPages`/`PAGE_SIZE`/`round2`/`createCoreApiClient` (`shared/api.ts`).
- `BetValue` enum lives in `src/objects/bet.object.ts` (`HOME_WIN`, `NULL_OR_DRAW`, `AWAY_WIN`).
- Prefer scaffolding new entities with `yarn twenty dev:add logicFunction` (generates the universalIdentifier).

---

### Task 1: Weighted-pick helper + unit test

**Files:**
- Create: `src/logic-functions/shared/random-prediction.ts`
- Test: `src/logic-functions/shared/random-prediction.unit-test.ts`

**Interfaces:**
- Consumes: `BetValue` from `src/objects/bet.object.ts`.
- Produces:
  - `type OutcomeProbabilities = { home: number; draw: number; away: number }`
  - `pickWeightedOutcome(probabilities: OutcomeProbabilities, random?: () => number): BetValue`
    - Order of cumulative weights: `home → draw → away`, mapping to `BetValue.HOME_WIN → NULL_OR_DRAW → AWAY_WIN`.
    - Normalizes by the sum of the three weights; `random` defaults to `Math.random`.

- [ ] **Step 1: Write the failing test**

```ts
import { describe, expect, it } from 'vitest';

import { pickWeightedOutcome } from 'src/logic-functions/shared/random-prediction';
import { BetValue } from 'src/objects/bet.object';

const probs = { home: 50, draw: 30, away: 20 };

describe('pickWeightedOutcome', () => {
  it('returns HOME_WIN at the bottom of the range', () => {
    expect(pickWeightedOutcome(probs, () => 0)).toBe(BetValue.HOME_WIN);
  });

  it('returns HOME_WIN just below the home boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.49)).toBe(BetValue.HOME_WIN);
  });

  it('returns NULL_OR_DRAW just above the home boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.51)).toBe(BetValue.NULL_OR_DRAW);
  });

  it('returns NULL_OR_DRAW just below the draw boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.79)).toBe(BetValue.NULL_OR_DRAW);
  });

  it('returns AWAY_WIN just above the draw boundary', () => {
    expect(pickWeightedOutcome(probs, () => 0.81)).toBe(BetValue.AWAY_WIN);
  });

  it('returns AWAY_WIN near the top of the range', () => {
    expect(pickWeightedOutcome(probs, () => 0.999)).toBe(BetValue.AWAY_WIN);
  });

  it('never selects a zero-weight outcome', () => {
    const noDraw = { home: 50, draw: 0, away: 50 };
    expect(pickWeightedOutcome(noDraw, () => 0.5)).toBe(BetValue.AWAY_WIN);
    expect(pickWeightedOutcome(noDraw, () => 0.499)).toBe(BetValue.HOME_WIN);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `yarn test:unit src/logic-functions/shared/random-prediction.unit-test.ts`
Expected: FAIL — cannot resolve `pickWeightedOutcome` (module not found).

- [ ] **Step 3: Write minimal implementation**

```ts
import { BetValue } from 'src/objects/bet.object';

export type OutcomeProbabilities = {
  home: number;
  draw: number;
  away: number;
};

export const pickWeightedOutcome = (
  probabilities: OutcomeProbabilities,
  random: () => number = Math.random,
): BetValue => {
  const weights: Array<{ value: BetValue; weight: number }> = [
    { value: BetValue.HOME_WIN, weight: Math.max(probabilities.home, 0) },
    { value: BetValue.NULL_OR_DRAW, weight: Math.max(probabilities.draw, 0) },
    { value: BetValue.AWAY_WIN, weight: Math.max(probabilities.away, 0) },
  ];

  const total = weights.reduce((sum, entry) => sum + entry.weight, 0);

  if (total <= 0) {
    return BetValue.NULL_OR_DRAW;
  }

  const threshold = random() * total;

  let cumulative = 0;
  for (const entry of weights) {
    cumulative += entry.weight;
    if (threshold < cumulative) {
      return entry.value;
    }
  }

  return weights[weights.length - 1].value;
};
```

- [ ] **Step 4: Run test to verify it passes**

Run: `yarn test:unit src/logic-functions/shared/random-prediction.unit-test.ts`
Expected: PASS (7 tests).

- [ ] **Step 5: Lint**

Run: `yarn lint`
Expected: no errors for the new files.

- [ ] **Step 6: Commit**

```bash
git add src/logic-functions/shared/random-prediction.ts src/logic-functions/shared/random-prediction.unit-test.ts
git commit -m "Add weighted outcome pick helper"
```

---

### Task 2: `random-predictions` logic function

**Files:**
- Create: `src/logic-functions/random-predictions.ts` (scaffold via `yarn twenty dev:add logicFunction` to obtain a valid UUID v4 `universalIdentifier`, then replace the generated body).

**Interfaces:**
- Consumes:
  - `pickWeightedOutcome`, `OutcomeProbabilities` from Task 1.
  - `fetchMatchResultChances`, `MatchResultChances` from `src/logic-functions/shared/odds.ts`.
  - `createCoreApiClient`, `fetchAllPages`, `PAGE_SIZE`, `round2` from `src/logic-functions/shared/api.ts`.
  - `canonicalTeamName`, `teamPairKey` from `src/logic-functions/shared/team-aliases.ts`.
  - `BetValue` from `src/objects/bet.object.ts`.
  - `RoutePayload` (HTTP event with `queryStringParameters: Record<string, string | undefined>`) from `twenty-sdk/define`.
- Produces: an HTTP GET route `/random-predictions` returning the JSON described below.

- [ ] **Step 1: Scaffold the logic function**

Run: `yarn twenty dev:add logicFunction`
- Name it `random-predictions` when prompted.
Expected: `src/logic-functions/random-predictions.ts` created with a valid `universalIdentifier`. Note that UUID — keep it.

- [ ] **Step 2: Replace the file body with the implementation**

Keep the scaffolded `universalIdentifier`; substitute it for `<KEEP_SCAFFOLDED_UUID>` below.

```ts
import { defineLogicFunction, RoutePayload } from 'twenty-sdk/define';

import {
  createCoreApiClient,
  fetchAllPages,
  PAGE_SIZE,
  round2,
} from 'src/logic-functions/shared/api';
import { fetchMatchResultChances } from 'src/logic-functions/shared/odds';
import {
  OutcomeProbabilities,
  pickWeightedOutcome,
} from 'src/logic-functions/shared/random-prediction';
import { canonicalTeamName, teamPairKey } from 'src/logic-functions/shared/team-aliases';
import { BetValue } from 'src/objects/bet.object';

type MatchRecord = {
  id: string;
  name: string | null;
  home: string | null;
  away: string | null;
  startDate: string | null;
};

const BET_VALUE_LABELS: Record<BetValue, string> = {
  [BetValue.HOME_WIN]: '1',
  [BetValue.NULL_OR_DRAW]: '0',
  [BetValue.AWAY_WIN]: '2',
};

const DEFAULT_COUNT = 1;

const parseCount = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_COUNT;
};

const toPercentage = (probability: number): number => Math.round(probability * 1000) / 10;

const handler = async (event: RoutePayload) => {
  const count = parseCount(event.queryStringParameters?.count);
  const client = createCoreApiClient();

  const [chancesByPair, matches] = await Promise.all([
    fetchMatchResultChances(),
    fetchAllPages<MatchRecord>(async (after) => {
      const { matches: page } = await client.query({
        matches: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: { id: true, name: true, home: true, away: true, startDate: true },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

  const now = Date.now();

  const upcoming = matches
    .filter(
      (match) =>
        match.home &&
        match.away &&
        match.startDate &&
        new Date(match.startDate).getTime() > now,
    )
    .sort(
      (a, b) => new Date(a.startDate as string).getTime() - new Date(b.startDate as string).getTime(),
    );

  const predictions: Array<{
    matchId: string;
    name: string | null;
    home: string;
    away: string;
    startDate: string;
    quotes: { home: number; draw: number; away: number };
    probabilities: { home: number; draw: number; away: number };
    prediction: BetValue;
    label: string;
  }> = [];

  for (const match of upcoming) {
    if (predictions.length >= count) {
      break;
    }

    const home = match.home as string;
    const away = match.away as string;
    const chance = chancesByPair.get(teamPairKey(home, away));

    if (!chance) {
      continue;
    }

    const homeProbability = chance.teamProbabilities.get(canonicalTeamName(home)) ?? 0;
    const awayProbability = chance.teamProbabilities.get(canonicalTeamName(away)) ?? 0;
    const drawProbability = chance.drawProbability;

    const probabilities: OutcomeProbabilities = {
      home: homeProbability,
      draw: drawProbability,
      away: awayProbability,
    };

    const prediction = pickWeightedOutcome(probabilities);

    predictions.push({
      matchId: match.id,
      name: match.name,
      home,
      away,
      startDate: match.startDate as string,
      quotes: {
        home: round2(chance.teamPrices.get(canonicalTeamName(home)) ?? 0),
        draw: round2(chance.drawPrice),
        away: round2(chance.teamPrices.get(canonicalTeamName(away)) ?? 0),
      },
      probabilities: {
        home: toPercentage(homeProbability),
        draw: toPercentage(drawProbability),
        away: toPercentage(awayProbability),
      },
      prediction,
      label: BET_VALUE_LABELS[prediction],
    });
  }

  return { count: predictions.length, predictions };
};

export default defineLogicFunction({
  universalIdentifier: '<KEEP_SCAFFOLDED_UUID>',
  name: 'random-predictions',
  description:
    'Returns randomized result predictions for the next N upcoming matches, weighted by live bookmaker odds.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/random-predictions',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
```

- [ ] **Step 3: Typecheck and lint**

Run: `yarn lint`
Expected: no errors.

If `RoutePayload` is not exported from `twenty-sdk/define`, import it from `twenty-sdk` instead (it is re-exported as `RoutePayload`); confirm with:
Run: `grep -rn "RoutePayload" node_modules/twenty-sdk/dist/define/index.d.ts node_modules/twenty-sdk/dist/logic-function/index.d.ts`
Expected: a matching `export ... RoutePayload` line; use whichever module path resolves.

- [ ] **Step 4: Run the full unit test suite**

Run: `yarn test:unit`
Expected: PASS (existing tests + Task 1 tests).

- [ ] **Step 5: Commit**

```bash
git add src/logic-functions/random-predictions.ts
git commit -m "Add random-predictions logic function"
```

---

### Task 3: Manual verification against live odds

**Files:** none (verification only).

- [ ] **Step 1: Start the dev server**

Run: `yarn twenty dev`
Expected: server boots; `random-predictions` is registered.

- [ ] **Step 2: Call the route with default count**

Hit `GET /random-predictions` (via the app's logic-function HTTP route, as done for `/live-match`).
Expected: JSON `{ "count": 0 or 1, "predictions": [...] }`. With at least one upcoming match that has live odds, `count` is `1` and the single prediction includes `quotes`, `probabilities` summing to ~100, a `prediction` of `HOME_WIN`/`NULL_OR_DRAW`/`AWAY_WIN`, and matching `label`.

- [ ] **Step 3: Call the route with `?count=3`**

Expected: up to 3 predictions, ordered by soonest `startDate`, each for a distinct upcoming match with live odds. If fewer than 3 qualify, `count` reflects the actual number returned.

- [ ] **Step 4: Confirm distribution is plausible**

Call the route several times for the same match; verify the chosen outcome varies and that the favorite (lowest quote / highest probability) is selected most often.

---

## Self-Review Notes

- **Spec coverage:** Trigger/input (Task 2 route + `parseCount`), data sources (Task 2 `fetchMatchResultChances` + `fetchAllPages`), handler flow steps 1–8 (Task 2), weighted helper (Task 1), output shape (Task 2 `predictions` push), testing (Task 1 unit test + Task 3 manual). No bet records created — confirmed.
- **Placeholder scan:** Only `<KEEP_SCAFFOLDED_UUID>` remains intentionally, resolved by the `dev:add` scaffold in Task 2 Step 1.
- **Type consistency:** `pickWeightedOutcome`/`OutcomeProbabilities` signatures match between Task 1 (produced) and Task 2 (consumed); `BetValue` labels match the `Bet.betValue` option labels `1`/`0`/`2`.
