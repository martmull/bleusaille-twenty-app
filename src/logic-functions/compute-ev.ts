import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { fetchMatchResultChances } from 'src/logic-functions/shared/odds';
import { updateBetEv } from 'src/logic-functions/shared/steps/update-bet-ev.step';
import { updateMatchQuotes } from 'src/logic-functions/shared/steps/update-match-quotes.step';

const handler = async () => {
  const client = createCoreApiClient();

  console.log('[compute-ev] fetching fresh quotes');
  const chances = await fetchMatchResultChances();

  console.log('[compute-ev] storing match quotes');
  const matchQuotes = await updateMatchQuotes(client, chances);
  console.log('[compute-ev] match quotes done', matchQuotes);

  console.log('[compute-ev] computing bet EV');
  const betEv = await updateBetEv(client, chances);
  console.log('[compute-ev] done', betEv);

  return { matchQuotes, betEv };
};

export default defineLogicFunction({
  universalIdentifier: '89fb7a31-79e1-48c6-858d-04cfb06461e8',
  name: 'compute-ev',
  description: 'Recomputes each bet EV from live match odds, without running the full pipeline.',
  timeoutSeconds: 120,
  handler,
  httpRouteTriggerSettings: {
    httpMethod: 'GET',
    isAuthRequired: false,
    path: '/compute-ev',
  },
});
