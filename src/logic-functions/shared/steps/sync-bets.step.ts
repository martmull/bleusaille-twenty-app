import { CoreApiClient } from 'twenty-client-sdk/core';

import { applyGroupedUpdates, chunk, fetchAllRecords } from 'src/logic-functions/shared/api';
import { KicktippBet, scrapeKicktippBets } from 'src/logic-functions/shared/kicktipp';
import { matchKey } from 'src/logic-functions/shared/team-aliases';
import { BetValue } from 'src/objects/bet.object';

type MatchRecord = { id: string; home: string; away: string };
type PersonRecord = { id: string; name: { firstName: string | null } };
type BetRecord = { id: string; name: string; betValue: string };

export type SyncBetsResult = {
  scrapedBets: number;
  createdPeople: number;
  createdBets: number;
  updatedBets: number;
  skippedNoMatch: number;
};

export const syncBets = async (
  client: CoreApiClient,
  kicktippBets?: KicktippBet[],
): Promise<SyncBetsResult> => {
  const bets = kicktippBets ?? (await scrapeKicktippBets());

  const [matches, people, existingBets] = await Promise.all([
    fetchAllRecords<MatchRecord>(client, 'matches', { id: true, home: true, away: true }),
    fetchAllRecords<PersonRecord>(client, 'people', { id: true, name: { firstName: true } }),
    fetchAllRecords<BetRecord>(client, 'bets', { id: true, name: true, betValue: true }),
  ]);

  const matchIdByKey = new Map(matches.map((match) => [matchKey(match.home, match.away), match.id]));

  const personIdByName = new Map(
    people
      .filter((person) => person.name.firstName)
      .map((person) => [person.name.firstName as string, person.id]),
  );

  const existingBetByName = new Map(existingBets.map((bet) => [bet.name, bet]));

  const matchableBets = bets.filter((bet) =>
    matchIdByKey.has(matchKey(bet.match.home, bet.match.away)),
  );
  const skippedNoMatch = bets.length - matchableBets.length;

  const actionableBets = [
    ...new Map(
      matchableBets.map((bet) => [
        `${bet.player}|${matchIdByKey.get(matchKey(bet.match.home, bet.match.away))}`,
        bet,
      ]),
    ).values(),
  ];

  const missingNames = [
    ...new Set(
      actionableBets.map((bet) => bet.player).filter((player) => !personIdByName.has(player)),
    ),
  ];

  for (const batch of chunk(missingNames, 50)) {
    const { createPeople } = await client.mutation({
      createPeople: {
        __args: { data: batch.map((firstName) => ({ name: { firstName, lastName: '' } })) },
        id: true,
        name: { firstName: true },
      },
    });

    for (const person of createPeople) {
      const firstName = person.name?.firstName;
      if (firstName) {
        personIdByName.set(firstName, person.id);
      }
    }
  }

  const createdPeople = missingNames.length;

  const toCreate: Array<{
    name: string;
    betValue: BetValue;
    personId: string;
    matchId: string;
  }> = [];
  const updates: Array<{ id: string; data: { betValue: BetValue } }> = [];

  for (const bet of actionableBets) {
    const matchId = matchIdByKey.get(matchKey(bet.match.home, bet.match.away)) as string;
    const personId = personIdByName.get(bet.player);

    if (!personId) {
      continue;
    }

    const betName = `${bet.player} - ${bet.match.home} vs ${bet.match.away}`;
    const existing = existingBetByName.get(betName);

    if (!existing) {
      toCreate.push({ name: betName, betValue: bet.betValue as BetValue, personId, matchId });
      continue;
    }

    if (existing.betValue !== bet.betValue) {
      updates.push({ id: existing.id, data: { betValue: bet.betValue as BetValue } });
    }
  }

  for (const batch of chunk(toCreate, 50)) {
    await client.mutation({
      createBets: { __args: { data: batch }, id: true },
    });
  }

  const createdBets = toCreate.length;

  const updatedBets = await applyGroupedUpdates(updates, (ids, data) =>
    client.mutation({
      updateBets: { __args: { data, filter: { id: { in: ids } } }, id: true },
    }),
  );

  return {
    scrapedBets: bets.length,
    createdPeople,
    createdBets,
    updatedBets,
    skippedNoMatch,
  };
};
