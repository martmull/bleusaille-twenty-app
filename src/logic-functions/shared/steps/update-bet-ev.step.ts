import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { computeBetEv, computeBetPuntevs } from 'src/logic-functions/shared/bet-ev';
import { fetchMatchResultChances, MatchResultChances } from 'src/logic-functions/shared/odds';
import { canonicalTeamName, teamPairKey } from 'src/logic-functions/shared/team-aliases';
import { BetValue } from 'src/objects/bet.object';

type BetRecord = {
  id: string;
  betValue: string;
  ev: number | null;
  puntevs: number | null;
  match: {
    id: string | null;
    home: string | null;
    away: string | null;
    stage: string | null;
    result: string | null;
  } | null;
};

export type UpdateBetEvResult = {
  evaluated: number;
  matchesWithOdds: number;
  updated: number;
};

const pickProbability = (
  betValue: string,
  match: { home: string | null; away: string | null },
  chances: MatchResultChances,
): number | null => {
  if (betValue === BetValue.NULL_OR_DRAW) {
    return chances.drawProbability;
  }
  if (betValue === BetValue.HOME_WIN && match.home) {
    return chances.teamProbabilities.get(canonicalTeamName(match.home)) ?? null;
  }
  if (betValue === BetValue.AWAY_WIN && match.away) {
    return chances.teamProbabilities.get(canonicalTeamName(match.away)) ?? null;
  }
  return null;
};

export const updateBetEv = async (
  client: CoreApiClient,
  chances?: Map<string, MatchResultChances>,
): Promise<UpdateBetEvResult> => {
  const [bets, chancesByPair] = await Promise.all([
    fetchAllPages<BetRecord>(async (after) => {
      const { bets: page } = await client.query({
        bets: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              betValue: true,
              ev: true,
              puntevs: true,
              match: { id: true, home: true, away: true, stage: true, result: true },
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
    chances ? Promise.resolve(chances) : fetchMatchResultChances(),
  ]);

  const betsByMatch = new Map<string, BetRecord[]>();
  for (const bet of bets) {
    const matchId = bet.match?.id;
    if (!matchId) {
      continue;
    }
    const matchBets = betsByMatch.get(matchId) ?? [];
    matchBets.push(bet);
    betsByMatch.set(matchId, matchBets);
  }

  const matchesWithOdds = new Set<string>();
  const updates: Array<{ id: string; data: { ev: number | null; puntevs: number | null } }> = [];

  for (const bet of bets) {
    const match = bet.match;

    if (match?.result) {
      continue;
    }

    const target =
      match?.id && match.home && match.away
        ? (() => {
            const chances = chancesByPair.get(teamPairKey(match.home, match.away));
            if (!chances) {
              return null;
            }
            matchesWithOdds.add(match.id as string);
            const matchBets = betsByMatch.get(match.id as string) ?? [];
            const winnersForPick = matchBets.filter(
              (other) => other.betValue === bet.betValue,
            ).length;
            const pickProb = pickProbability(bet.betValue, match, chances);
            return {
              ev: computeBetEv({
                stage: match.stage,
                winnersForPick,
                pickProbability: pickProb,
              }),
              puntevs: computeBetPuntevs({ winnersForPick, pickProbability: pickProb }),
            };
          })()
        : null;

    const targetEv = target?.ev ?? null;
    const targetPuntevs = target?.puntevs ?? null;

    if (bet.ev === targetEv && bet.puntevs === targetPuntevs) {
      continue;
    }

    updates.push({ id: bet.id, data: { ev: targetEv, puntevs: targetPuntevs } });
  }

  const updated = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateBets: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return { evaluated: bets.length, matchesWithOdds: matchesWithOdds.size, updated };
};
