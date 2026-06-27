import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllRecords } from 'src/logic-functions/shared/api';
import { computeBetPuntevs } from 'src/logic-functions/shared/bet-ev';
import { computePuntos, PuntosBet } from 'src/logic-functions/shared/compute-puntos';
import { BetValue } from 'src/objects/bet.object';

type BetMatch = {
  id: string | null;
  result: string | null;
  stage: string | null;
  prematchHomeCote: number | null;
  prematchDrawCote: number | null;
  prematchAwayCote: number | null;
};

type BetRecord = Omit<PuntosBet, 'match'> & {
  puntos: number | null;
  puntevs: number | null;
  match: BetMatch | null;
};

export type ComputePuntosResult = {
  evaluated: number;
  updated: number;
};

/**
 * Margin-normalised implied probability of this bet's predicted outcome, derived
 * from the match's stored prematch decimal odds (the last odds seen before
 * kickoff). Returns null when the prematch odds are not available.
 */
const prematchPickProbability = (betValue: string, match: BetMatch): number | null => {
  const { prematchHomeCote, prematchDrawCote, prematchAwayCote } = match;

  if (!prematchHomeCote || !prematchDrawCote || !prematchAwayCote) {
    return null;
  }

  const homeInverse = 1 / prematchHomeCote;
  const drawInverse = 1 / prematchDrawCote;
  const awayInverse = 1 / prematchAwayCote;
  const total = homeInverse + drawInverse + awayInverse;

  if (total <= 0) {
    return null;
  }

  if (betValue === BetValue.HOME_WIN) {
    return homeInverse / total;
  }
  if (betValue === BetValue.NULL_OR_DRAW) {
    return drawInverse / total;
  }
  if (betValue === BetValue.AWAY_WIN) {
    return awayInverse / total;
  }
  return null;
};

export const computeBetsPuntos = async (client: CoreApiClient): Promise<ComputePuntosResult> => {
  const bets = await fetchAllRecords<BetRecord>(client, 'bets', {
    id: true,
    betValue: true,
    won: true,
    puntos: true,
    puntevs: true,
    match: {
      id: true,
      result: true,
      stage: true,
      prematchHomeCote: true,
      prematchDrawCote: true,
      prematchAwayCote: true,
    },
  });

  // How many bettors picked each (match, outcome) pair: the pot is shared
  // between them, so this weights the expected puntos. Built once to avoid an
  // O(n^2) re-scan of every bet inside the loop below.
  const winnersByPick = new Map<string, number>();
  for (const bet of bets) {
    const matchId = bet.match?.id;
    if (!matchId) {
      continue;
    }
    const key = `${matchId}|${bet.betValue}`;
    winnersByPick.set(key, (winnersByPick.get(key) ?? 0) + 1);
  }

  const updates: Array<{ id: string; data: { puntos: number; puntevs: number | null } }> = [];

  for (const bet of bets) {
    if (!bet.match?.result) {
      continue;
    }

    const puntos = computePuntos(bet, bets);

    const winnersForPick = winnersByPick.get(`${bet.match.id}|${bet.betValue}`) ?? 0;

    const puntevs = computeBetPuntevs({
      winnersForPick,
      pickProbability: prematchPickProbability(bet.betValue, bet.match),
    });

    if (bet.puntos === puntos && bet.puntevs === puntevs) {
      continue;
    }

    updates.push({ id: bet.id, data: { puntos, puntevs } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateBets: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { evaluated: bets.length, updated };
};
