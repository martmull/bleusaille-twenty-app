import { CoreApiClient } from 'twenty-client-sdk/core';

import { chunk, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { KicktippBet, scrapeKicktippBets } from 'src/logic-functions/shared/kicktipp';

type PersonRecord = { id: string; name: { firstName: string | null } };

export type ImportBettorsResult = {
  bettors: number;
  created: number;
  alreadyPresent: number;
};

export const importBettors = async (
  client: CoreApiClient,
  kicktippBets?: KicktippBet[],
): Promise<ImportBettorsResult> => {
  const bets = kicktippBets ?? (await scrapeKicktippBets());
  const bettorNames = [...new Set(bets.map((bet) => bet.player))];

  const people = await fetchAllPages<PersonRecord>(async (after) => {
    const { people: page } = await client.query({
      people: {
        __args: { first: PAGE_SIZE, after },
        edges: { node: { id: true, name: { firstName: true } } },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const existingNames = new Set(
    people
      .map((person) => person.name.firstName)
      .filter((firstName): firstName is string => !!firstName),
  );

  const toCreate = bettorNames
    .filter((bettorName) => !existingNames.has(bettorName))
    .map((firstName) => ({ name: { firstName, lastName: '' } }));

  for (const batch of chunk(toCreate, 50)) {
    await client.mutation({
      createPeople: { __args: { data: batch }, id: true },
    });
  }

  const created = toCreate.length;

  return {
    bettors: bettorNames.length,
    created,
    alreadyPresent: bettorNames.length - created,
  };
};
