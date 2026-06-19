import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { computeWinnerBetPot } from 'src/logic-functions/shared/winner-bet-puntos-ev';

type PersonRecord = {
  name: { firstName: string | null } | null;
  wcWinnerBet: string | null;
  victoryChance: number | null;
  winnerBetPuntosEv: number | null;
};

type GroupAccumulator = {
  team: string;
  victoryChance: number | null;
  puntosIfVictory: number | null;
  footixs: string[];
};

type WinnerBetGroup = GroupAccumulator & {
  puntosWonIfVictory: number | null;
};

const handler = async (): Promise<{ bets: WinnerBetGroup[] }> => {
  const client = createCoreApiClient();

  const people = await fetchAllPages<PersonRecord>(async (after) => {
    const { people: page } = await client.query({
      people: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: {
            name: { firstName: true },
            wcWinnerBet: true,
            victoryChance: true,
            winnerBetPuntosEv: true,
          },
        },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const participantCount = people.length;
  const normalizeTeam = (team: string): string => team.trim().toLowerCase();

  const predictorsByTeam = new Map<string, number>();
  for (const person of people) {
    if (person.wcWinnerBet) {
      const key = normalizeTeam(person.wcWinnerBet);
      predictorsByTeam.set(key, (predictorsByTeam.get(key) ?? 0) + 1);
    }
  }

  const groupsByTeam = new Map<string, GroupAccumulator>();
  for (const person of people) {
    const footix = person.name?.firstName;
    const team = person.wcWinnerBet;
    if (!footix || !team) {
      continue;
    }

    const group = groupsByTeam.get(team) ?? {
      team,
      victoryChance: person.victoryChance,
      puntosIfVictory: person.winnerBetPuntosEv,
      footixs: [],
    };
    group.footixs.push(footix);
    groupsByTeam.set(team, group);
  }

  const bets: WinnerBetGroup[] = [...groupsByTeam.values()]
    .map((group) => {
      const pot = computeWinnerBetPot({
        participantCount,
        predictorsForTeam: predictorsByTeam.get(normalizeTeam(group.team)) ?? 0,
      });

      return {
        ...group,
        puntosWonIfVictory: pot === null ? null : Math.round(pot),
        footixs: group.footixs.sort((a, b) => a.localeCompare(b)),
      };
    })
    .sort((a, b) => (b.puntosIfVictory ?? 0) - (a.puntosIfVictory ?? 0));

  return { bets };
};

export default defineLogicFunction({
  universalIdentifier: '3a4d06d1-18c4-4743-a371-d8bbc6110633',
  name: 'winner-bets',
  description:
    'Returns each World Cup winner bet (highest expected puntos first) with its victory chance, the expected puntos if it wins, and the list of footixs who picked it.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/winner-bets',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
