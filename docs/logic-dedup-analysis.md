# Logic layer cleanup — deduplication & simplification analysis

_Architect-level review of `src/logic-functions/**` to remove duplicated API/DB calls and shrink the
code while preserving behavior. Produced by a multi-agent pass (6 mappers → 8 adversarial skeptics →
1 architect synthesis). Every "fuse everything into one mega-step" idea was challenged against the
real code; the lossy ones were downgraded to the safe partial documented below._

## The shape of the code today

The logic layer is a **13-step `synchronize` pipeline** (`synchronize.ts`) plus ~7 read/render
entrypoints, all built on a solid `shared/api.ts` (`fetchAllPages`, `applyGroupedUpdates`, `chunk`,
`round2` are already centralized). The real waste is two-fold:

1. **Redundant full-table DB scans within a single `synchronize` run** — `people` is scanned ~7×,
   `matches` ~4×, `bets` ~3×, `puntosEvolutions` ~2×.
2. **Verbatim scaffolding duplicated across files** — the paging block, the diff→grouped-write tail,
   HTTP fetch+throw+parse ceremony, ranking/leaderboard logic, match-window selection, and
   de-vig/EV/puntos formulas are each copy-pasted in several places.

## The trap we avoided (why the obvious merge is wrong)

The most tempting refactor — *"fetch each table once into a shared context and thread it through all
steps"* — is a **correctness regression**. The `synchronize` steps form an ordered pipeline where
earlier steps mutate rows later steps re-read (`syncMatches`→`syncBets`; `settleBets` writes `won` →
`computePuntos`; `computePuntos` writes `puntos` → evolution → people-puntos). A shared in-memory
cache would feed **stale** data downstream. So all DB-scan reduction here is limited to
**provably-safe consecutive read-after-write pairs**, not a global cache.

Similarly rejected by the skeptics:
- A single generic HTTP helper for all 4 external sources — their ok-check / failure-action / parse
  policies differ in load-bearing ways (sportscore null-on-non-200, odds 404 = market-not-offered
  must **not** throw).
- One `updatePeopleAggregates` mega-step — the people steps write **different row subsets** with
  different keying, external inputs, and null semantics.
- Fusing `updateMatchQuotes` + `updateMatchBreakeven` into one always-writes-both step —
  `compute-ev.step.ts` calls `updateMatchQuotes` **alone** and must never start writing breakeven.

## Work items (~330 lines removed, behavior preserved)

| ID | Pri | Title | Est. lines | Risk |
|----|-----|-------|-----------|------|
| W1 | P0 | Generic `fetchAllRecords` pager + `createInChunks` helper (~30 call sites) | ~95 | low |
| W2 | P0 | Share quotes/breakeven scaffolding; derive breakeven from in-memory quotes in `synchronize` | ~45 | med |
| W3 | P1 | Extract the identical diff+write **tail** from the 5 people-update steps | ~22 | low |
| W6 | P1 | Shared HTTP layer (`fetchOk`/`fetchJson`/`fetchText`/`fetchJsonOrNull`) as explicit variants | ~45 | med |
| W7 | P1 | Shared leaderboard/ranking module (`computeRanks`, scenario, `rankDelta`) | ~40 | low |
| W8 | P1 | Adopt the dead-but-correct `selectCurrentMatch`; delete hand-rolled match-window selection | ~30 | med |
| W4 | P2 | Merge the two EV people steps (steps 9+10) → drop one `people` scan | ~18 | med |
| W5 | P2 | Thread `puntosEvolution` totals from step 5 into step 6 → drop one `puntosEvolutions` scan | ~15 | low |
| W9 | P2 | Consolidate puntos/EV/de-vig/pot-share formulas into one math module | ~22 | med |
| W10 | P2 | Unify team-name normalization; **fix winner-chances key bug**; remove dead exports | ~18 | med |
| W11 | P2 | Shared route-param parsers + O(1) `winnersForPick` map in compute-puntos | ~13 | low |

### W1 — Generic paged-fetch wrapper + create-in-chunks helper _(P0, ~95 lines)_
Add one generic entity-keyed pager to `api.ts`:
`fetchAllRecords<TNode>(client, entity, node, args?)` that builds the
`{ [entity]: { __args: { first: PAGE_SIZE, after, ...args }, edges: { node }, pageInfo: {...} } }`
shape, runs the existing `fetchAllPages` loop, and destructures `result[entity]`. **Callers still pass
their own typed `node` selection and `TNode`** plus optional `args.filter`/`args.orderBy` — so no
over-fetch. Add `createInChunks(items, makeMutation)` for the verbatim `chunk(toCreate, 50)` loop.
Replace ~30 inline paging blocks.
- **Do not** add fixed `queryAllPeople/Matches/Bets` presets (selection sets vary 6 ways for matches
  alone) and **do not** thread a shared fetch context (stale-cache trap).
- **In-flight correctness fix:** `best-strategy-prediction.ts:46` runs an **unpaginated** people query
  today — migrating it to `fetchAllRecords` fixes pagination.

### W2 — Share quotes/breakeven scaffolding + eliminate the breakeven re-scan _(P0, ~45 lines)_
Keep **two** exported steps. Two safe moves:
- (a) Extract `applyMatchFieldUpdates(matches, compute(match,now)->{live, prematch?}, write)` owning the
  `now`/`isUpcoming` gate, the `liveChanged || prematchChanged` diff, the
  `{...live, ...(isUpcoming?prematch:{})}` payload spread, and the `applyGroupedUpdates` call. Both
  steps become thin compute callbacks.
- (b) **Inside `synchronize` only**, have `updateMatchQuotes` return its in-memory
  matches-with-new-quotes and let `updateMatchBreakeven` accept them as an optional preloaded param
  (mirroring the existing `chances` optional-arg idiom), deriving breakeven via `computeBreakeven`
  from those in-memory quotes instead of re-reading the `matches` table. Standalone path keeps its own
  fetch. Breakeven still uses the **live** quote (not prematch) and stays null on result.

### W3 — Extract the people-step diff+write tail _(P1, ~22 lines)_
Add `applyFieldUpdates<TRecord, TField>(records, { currentOf, targetOf, buildData, updateMany })` to
`api.ts`. Each step keeps its **own** fetch + bespoke pre-pass + `targetOf` closure + return object;
only the diff→`applyGroupedUpdates` tail is shared. Must support a **SKIP sentinel** so
`update-people-puntos` (people absent from the evolutions map) and `update-victory-chance`
(`wcWinnerBet != null` gate) keep exact row-membership behavior.

### W6 — Shared HTTP layer _(P1, ~45 lines)_
`shared/http.ts` with `fetchOk` / `fetchJson<T>` / `fetchText` / `fetchJsonOrNull` (200-only, for
sportscore). Replace the ~9 verbatim fetch+`!ok`+throw+parse blocks. **Preserve each source's failure
policy as explicit variants** — sportscore null-on-non-200 (`redirect: 'manual'`), odds
notify-then-throw and 404-as-silent-null, kicktipp login's no-ok-check (reads `set-cookie`
regardless). Do not flatten into one throwing helper.

### W7 — Shared leaderboard/ranking module _(P1, ~40 lines)_
`finished-matches.ts` and `match-odds.ts` duplicate `RankTotals` + `computeRanks` + scenario-cloning +
`rankDelta` **verbatim**. Extract `shared/leaderboard.ts` (`computeRanks` = sort by total desc then
`firstName` localeCompare, 1-based ranks; `buildTotalsFromPeople`; `applyScenario`;
`computeRankDeltas`). `podium` reuses `buildTotalsFromPeople` only (its grouping differs — not folded
into the rank machinery).

### W8 — Adopt the dead `selectCurrentMatch` _(P1, ~30 lines)_
`shared/current-match.ts` exports `selectCurrentMatch` but **no production entrypoint imports it** —
only its own unit test. Add a `selectUpcomingMatches` sibling; route `random-predictions` and
`best-strategy` through them, deleting their hand-rolled
`filter(home && away && startDate)`+date-parse+sort. For `live-match`, delegate only the
playable-filter+sort+window (not its live/finished branching) — **first verify** its
`FALLBACK_LIVE_WINDOW_MS` (3h) equals current-match's `MAX_MATCH_DURATION_MS` (3h).

### W4 — Merge the two EV people steps _(P2, ~18 lines)_
Merge **only** `update-winner-bet-puntos-ev` (step 9) + `update-puntos-wcw-ev` (step 10) — the two
genuinely-identical pure-compute-over-people steps with a real data dependency
(`puntosWcwEv = round2(puntos + winnerBetPuntosEv)`). One `updatePeopleEvAggregates` fetches people
once and writes both fields. Keep the other people steps separate.

### W5 — Thread puntosEvolution totals step 5 → step 6 _(P2, ~15 lines)_
`computePuntosEvolution` already computes per-person totals in memory; return them and let
`updatePeoplePuntos` accept the `Map<personId, points>` as an optional preloaded param, skipping its
own full `puntosEvolutions` re-scan.

### W9 — Consolidate puntos/EV/de-vig/pot-share formulas _(P2, ~22 lines)_
Make `compute-puntos.ts` the single puntos-math home: `getMatchPot(stage)`,
`sharePerWinner(pot, winners)`, `expectedPuntos(share, prob)`, and a `deVig`/`inverseQuote` helper.
Replaces 3 copies of pot math, 3 copies of pot/winners share, 2 EV copies, and the duplicated
implied-probability logic in `generate-best-strategy-bets` + `match-odds`. **Forces one rounding
policy** (`Math.round` vs `round2` differ today; can shift persisted values by ≤1 — verify vs tests).

### W10 — Unify team-name normalization + fix a join bug _(P2, ~18 lines)_
Extract `stripDiacritics` once; rebuild `normalizeTeamName`/`toSportscoreSlug` on it; move
`normalizeTeamName` out of the `api.ts` grab-bag. Replace `winner-bets` local `normalizeTeam` with
`canonicalTeamName`. **Correctness fix:** `fetchWorldCupWinnerChances` (`odds.ts:55`) keys its Map by
raw `outcome.name.trim().toLowerCase()` instead of `canonicalTeamName`, so aliased names (USA, Czech
Republic, Türkiye) **silently fail to join** every other odds map.

### W11 — Shared route-param parsers + O(1) winners map _(P2, ~13 lines)_
`shared/route-params.ts` with `parseBoolean`/`parseIntParam`/`parseNumberParam`/`toPercentage`.
Separately, fix the O(n²) re-scan in `compute-puntos.step.ts:96-102` — pre-build a
`${matchId}|${betValue}` → winner-count Map once instead of `bets.filter(...)` per bet.

## Recommended sequencing

1. **W1 first** — it's the substrate every step/entrypoint touches; landing it first means W2–W5
   migrate onto it rather than re-touching the same paging blocks twice.
2. **W2** — self-contained, high DB-scan savings.
3. **P1 mechanical extractions** (W6, W3, W7, W8) — each isolated; W7/W8 can go in parallel.
4. **P2** (W4, W5 together; then W9; then W10, W11) — re-point `synchronize` wiring and re-run the
   pipeline/tests once.

Run unit tests + a dry-run of `synchronize`/`compute-ev` after each tier, with extra care after the
read-after-write eliminations (W2, W4, W5) and the rounding consolidation (W9).

## Two latent bugs surfaced (fix intentionally, not silently)

- **`best-strategy-prediction.ts:46`** — unpaginated `people` query (only the first page is read).
- **`fetchWorldCupWinnerChances` (`odds.ts:55`)** — keys by raw lowercased name instead of
  `canonicalTeamName`, so aliased team names never join the rest of the odds pipeline.
