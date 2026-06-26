import { CoreApiClient } from 'twenty-client-sdk/core';

import { fetchExternalData } from 'src/logic-functions/shared/external-data';
import { updateMatchQuotes } from 'src/logic-functions/shared/steps/update-match-quotes.step';

export const computeEv = async (client: CoreApiClient) => {
  console.log('[compute-ev] fetching fresh quotes');
  const { matchResultChances } = await fetchExternalData({
    ignore: [
      'kicktippBets',
      'worldCupMatches',
      'kicktippWcWinners',
      'worldCupWinnerChances',
    ],
  });

  console.log('[compute-ev] storing match quotes');
  const matchQuotes = await updateMatchQuotes(client, matchResultChances);
  console.log('[compute-ev] match quotes done', matchQuotes);

  return { matchQuotes };
};
