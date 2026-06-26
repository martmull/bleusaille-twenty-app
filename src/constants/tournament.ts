// The pool of people placing bets is fixed for the whole tournament, so we
// hard-code it instead of counting bettors on every computation.
export const NUMBER_OF_BETTORS = 17;

// Each bettor stakes 10 puntos on a match.
export const PUNTOS_PER_BETTOR = 10;

// Total puntos shared between the winners of a match, before the stage
// multiplier is applied: NUMBER_OF_BETTORS * PUNTOS_PER_BETTOR = 170.
export const PUNTOS_SHARED_PER_MATCH = NUMBER_OF_BETTORS * PUNTOS_PER_BETTOR;
