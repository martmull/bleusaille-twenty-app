import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  MatchOddsScope,
  updateMatchQuotes,
} from 'src/logic-functions/shared/steps/update-match-quotes.step';

export const computeEv = async (client: CoreApiClient, scope: MatchOddsScope = 'all') => {
  console.log('[compute-ev] storing match quotes', { scope });
  const matchQuotes = await updateMatchQuotes(client, undefined, undefined, scope);
  console.log('[compute-ev] match quotes done', matchQuotes);

  return { matchQuotes };
};
