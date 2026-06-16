import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { syncBets } from 'src/logic-functions/shared/steps/sync-bets.step';

const handler = async () => syncBets(createCoreApiClient());

export default defineLogicFunction({
  universalIdentifier: '3dcefe42-c30c-4419-b7e6-b6277b577548',
  name: 'sync-bets',
  description:
    'Logs in to kicktipp, scrapes every matchday leaderboard, and upserts one bet per person per match.',
  timeoutSeconds: 300,
  handler,
});
