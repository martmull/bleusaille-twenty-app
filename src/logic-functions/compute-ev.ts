import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { computeEv } from 'src/logic-functions/shared/steps/compute-ev.step';

const handler = async () => {
  const client = createCoreApiClient();

  return computeEv(client);
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
