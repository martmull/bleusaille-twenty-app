/**
 * Breakeven bettor count for a match outcome: the most bettors that outcome can
 * have while its local pool quote (totalBets / bettorsOnOutcome) stays at or
 * above the live bookmaker quote. Past this count the local quote is worth less
 * than the real one.
 * Returns null when there is no live quote to compare against.
 */
export const computeBreakeven = (
  totalBets: number,
  realQuote: number | null,
): number | null => {
  if (realQuote === null || realQuote <= 0) {
    return null;
  }


  return Math.floor(totalBets / realQuote);
};
