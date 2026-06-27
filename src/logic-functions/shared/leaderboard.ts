// Shared leaderboard/ranking helpers used by match-odds and finished-matches.
// Both modules previously duplicated RankTotals + computeRanks verbatim and
// re-implemented the "clone totals, apply a payout scenario, re-rank" idiom.

export type RankTotals = Map<string, { firstName: string; total: number }>;

// Ranks people by total descending, breaking ties by first name so the order is
// stable. Returns a map of person id -> 1-based rank.
export const computeRanks = (totals: RankTotals): Map<string, number> => {
  const sorted = [...totals.entries()].sort(
    (a, b) => b[1].total - a[1].total || a[1].firstName.localeCompare(b[1].firstName),
  );
  const ranks = new Map<string, number>();
  sorted.forEach(([id], index) => ranks.set(id, index + 1));
  return ranks;
};

// Deep-clones a RankTotals so a scenario can mutate the copy without touching
// the base map.
export const cloneTotals = (totals: RankTotals): RankTotals =>
  new Map([...totals.entries()].map(([id, value]) => [id, { ...value }]));
