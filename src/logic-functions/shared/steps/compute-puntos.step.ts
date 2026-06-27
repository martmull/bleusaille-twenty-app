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

  const updates: Array<{ id: string; data: { puntos: number; puntevs: number | null } }> = [];

  for (const bet of bets) {
    if (!bet.match?.result) {
      continue;
    }

    const puntos = computePuntos(bet, bets);

    // How many bettors picked the same outcome as this bet (the pot is shared
    // between them), used to weight the expected puntos.
    const winnersForPick = bets.filter(
      (other) => other.match?.id === bet.match?.id && other.betValue === bet.betValue,
    ).length;

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
