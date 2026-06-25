type BetValue = "HOME_WIN" | "NULL_OR_DRAW" | "AWAY_WIN";
type RankState = "HIGH" | "MID" | "LOW";

interface Match {
  id: string;
  name: string;
  // Prematch decimal odds (cotes)
  prematchHomeCote: number;
  prematchDrawCote: number;
  prematchAwayCote: number;
}

interface Bettor {
  id: string;
  name: string;
  points: number; // current standings points
}

export interface GeneratedBet {
  matchId: string;
  matchName: string;
  betValue: BetValue;
  cote: number;
  impliedProb: number; // de-vigged
  category: "favorite" | "draw" | "underdog";
  rankState: RankState;
  reason: string;
}

interface Params {
  bettorName: string;
  match: Match;
  bettors: Bettor[]; // full standings, used to compute the bettor's live rank
}

// ---- Tunable thresholds (derived from the analysis) ----
const VALUE_ZONE_MIN = 0.35;
const VALUE_ZONE_MAX = 0.65;
const STRONG_FAV_MIN = 1.3;
const STRONG_FAV_MAX = 1.7;
const HUGE_FAV_MAX = 1.3; // cote <= this => "huge favorite" (avoid: ~61% win, ~7.6 pts only)
const DRAW_VALUE_MIN = 3.5;
const DRAW_VALUE_MAX = 6;
const UNDERDOG_AVOID_COTE = 3.5; // underdog above this cote won ~0% historically => never pick
const OVERPRICED_PROB = 0.8; // implied prob above this => over-priced trap

// ---- Known bettor "team loyalty" biases (observed in the data) ----
// Some bettors always back the same team regardless of odds.
// Mamat backed Sweden in every Sweden game (HOME_WIN when Sweden was home,
// AWAY_WIN when Sweden was away). Keyed by lowercased bettor name -> team.
const TEAM_LOYALTIES: Record<string, string> = {
  mamat: "Sweden",
};

/**
 * Parse a "Home vs Away" match name and, if `team` plays, return which
 * outcome corresponds to that team winning. Returns null if the team
 * isn't in this match.
 */
const sideForTeam = (
  matchName: string,
  team: string,
): "HOME_WIN" | "AWAY_WIN" | null => {
  const parts = matchName.split(/\s+vs\s+/i);
  if (parts.length !== 2) return null;
  const [home, away] = parts.map((s) => s.trim().toLowerCase());
  const t = team.trim().toLowerCase();
  if (home === t) return "HOME_WIN";
  if (away === t) return "AWAY_WIN";
  return null;
};

export const generateBets = ({
                               bettorName,
                               match,
                               bettors,
                             }: Params): GeneratedBet => {
  // --- 1. Determine the bettor's live rank state (top/mid/bottom third) ---
  // Fail loudly rather than silently producing a leader's slate for a
  // trailing bettor (the bug that gave Yangibal #16 the same picks as #3).
  const hasPoints = bettors.every(
    (b) => typeof b.points === "number" && !Number.isNaN(b.points),
  );
  if (!hasPoints) {
    throw new Error(
      "generateBets: every bettor must have a numeric `points` value — " +
      "rank cannot be computed otherwise.",
    );
  }

  const sorted = [...bettors].sort((a, b) => b.points - a.points);
  const idx = sorted.findIndex((b) => b.name === bettorName);
  if (idx === -1) {
    throw new Error(
      `generateBets: bettor "${bettorName}" not found in standings ` +
      `(${sorted.map((b) => b.name).join(", ")}). Name must match exactly.`,
    );
  }

  const n = sorted.length;
  const pct = n > 1 ? idx / (n - 1) : 0.5; // 0 = leader, 1 = last
  const rankState: RankState =
    pct <= 1 / 3 ? "HIGH" : pct >= 2 / 3 ? "LOW" : "MID";

  // --- 2. De-vig the cotes into true implied probabilities ---
  const cotes: Record<BetValue, number> = {
    HOME_WIN: match.prematchHomeCote,
    NULL_OR_DRAW: match.prematchDrawCote,
    AWAY_WIN: match.prematchAwayCote,
  };
  const overround =
    1 / cotes.HOME_WIN + 1 / cotes.NULL_OR_DRAW + 1 / cotes.AWAY_WIN;
  const prob: Record<BetValue, number> = {
    HOME_WIN: 1 / cotes.HOME_WIN / overround,
    NULL_OR_DRAW: 1 / cotes.NULL_OR_DRAW / overround,
    AWAY_WIN: 1 / cotes.AWAY_WIN / overround,
  };

  // Market favorite = lowest cote
  const outcomes: BetValue[] = ["HOME_WIN", "NULL_OR_DRAW", "AWAY_WIN"];
  const favorite = outcomes.reduce((a, b) => (cotes[a] <= cotes[b] ? a : b));

  const categoryOf = (o: BetValue): GeneratedBet["category"] =>
    o === "NULL_OR_DRAW" ? "draw" : o === favorite ? "favorite" : "underdog";

  const build = (o: BetValue, reason: string): GeneratedBet => ({
    matchId: match.id,
    matchName: match.name,
    betValue: o,
    cote: cotes[o],
    impliedProb: prob[o],
    category: categoryOf(o),
    rankState,
    reason,
  });

  // Guardrail: an outcome we should never recommend as a pick.
  // - underdog priced above UNDERDOG_AVOID_COTE (won ~0% historically)
  const isForbidden = (o: BetValue): boolean =>
    categoryOf(o) === "underdog" && cotes[o] > UNDERDOG_AVOID_COTE;

  // --- 0. SPECIAL CASE: team-loyalty override (highest priority) ---
  // If this bettor always backs a specific team and that team is playing,
  // bet on that team regardless of the value strategy.
  const loyalTeam = TEAM_LOYALTIES[bettorName.trim().toLowerCase()];
  if (loyalTeam) {
    const loyalSide = sideForTeam(match.name, loyalTeam);
    if (loyalSide) {
      return build(
        loyalSide,
        `${bettorName} always backs ${loyalTeam} — betting ${loyalSide} (${loyalTeam} side)`,
      );
    }
  }

  // --- 3. Identify candidate picks ---
  const favIsHuge = cotes[favorite] <= HUGE_FAV_MAX;

  // Value-zone favorite (the main edge).
  // Exclude huge favorites (cote <= 1.3): they win less and pay almost nothing.
  const valueZoneFav =
    categoryOf(favorite) === "favorite" &&
    !favIsHuge &&
    prob[favorite] >= VALUE_ZONE_MIN &&
    prob[favorite] <= VALUE_ZONE_MAX
      ? favorite
      : null;

  // Strong reliable favorite (anchor for leaders).
  // Restricted to the 1.3–1.7 sweet spot, so huge favorites are excluded.
  const strongFav =
    !favIsHuge &&
    cotes[favorite] >= STRONG_FAV_MIN &&
    cotes[favorite] <= STRONG_FAV_MAX
      ? favorite
      : null;

  // Value draw (upside / catch-up)
  const valueDraw =
    cotes.NULL_OR_DRAW >= DRAW_VALUE_MIN && cotes.NULL_OR_DRAW <= DRAW_VALUE_MAX
      ? ("NULL_OR_DRAW" as BetValue)
      : null;

  // Safe fallback, rank-aware:
  // - Leaders never chase the draw lottery — protect the lead with the favorite.
  // - Non-leaders only pivot to the draw when the favorite is a genuine
  //   over-priced huge-favorite trap (implied > 80% AND cote <= 1.3), and the
  //   draw line isn't absurdly long. Otherwise keep the favorite.
  const computeSafeFallback = (): BetValue => {
    const favOverpriced = prob[favorite] > OVERPRICED_PROB;
    const favIsTrap = favOverpriced && favIsHuge;
    const drawIsPlayable = cotes.NULL_OR_DRAW <= DRAW_VALUE_MAX;

    if (rankState === "HIGH") return favorite;
    if (favIsTrap && drawIsPlayable) return "NULL_OR_DRAW";
    return favorite;
  };
  const safeFallback = computeSafeFallback();

  // Final safety net: never return a forbidden (long-shot underdog) pick.
  const finalize = (o: BetValue, reason: string): GeneratedBet => {
    if (isForbidden(o)) {
      return build(
        favorite,
        `${reason} (overrode forbidden long-shot underdog → favorite)`,
      );
    }
    return build(o, reason);
  };

  // --- 4. Pick according to rank ---
  switch (rankState) {
    // Leader: prioritize reliability, then the value edge.
    case "HIGH": {
      if (strongFav)
        return finalize(
          strongFav,
          "Leading: anchor with a strong favorite (cote 1.3–1.7, ~77% win)",
        );
      if (valueZoneFav)
        return finalize(
          valueZoneFav,
          "Leading: value-zone favorite (implied 35–65%, +edge)",
        );
      return finalize(safeFallback, "Leading: safest non-overpriced outcome");
    }

    // Trailing: comeback mode — value zone first, then draws for upside.
    case "LOW": {
      if (valueZoneFav)
        return finalize(
          valueZoneFav,
          "Trailing: value-zone favorite for a strong base (+edge)",
        );
      if (valueDraw)
        return finalize(
          valueDraw,
          "Trailing: high-upside draw (cote 3.5–6, ~13.6 pts) to catch up",
        );
      if (strongFav)
        return finalize(strongFav, "Trailing: fall back to a strong favorite");
      return finalize(safeFallback, "Trailing: safest non-overpriced outcome");
    }

    // Middle: break out of the conservative trap — lean into the value edge + draws.
    case "MID":
    default: {
      if (valueZoneFav)
        return finalize(
          valueZoneFav,
          "Mid-pack: exploit value-zone favorite (best risk-adjusted edge)",
        );
      if (valueDraw)
        return finalize(
          valueDraw,
          "Mid-pack: add upside with a value draw (cote 3.5–6)",
        );
      if (strongFav)
        return finalize(strongFav, "Mid-pack: anchor with a strong favorite");
      return finalize(safeFallback, "Mid-pack: safest non-overpriced outcome");
    }
  }
};
