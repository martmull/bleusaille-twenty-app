import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { syncMatches } from 'src/logic-functions/shared/steps/sync-matches.step';

const handler = async () => syncMatches(createCoreApiClient());

export default defineLogicFunction({
  universalIdentifier: '12eefb01-1aba-47c7-bab9-b90e027cac7d',
  name: 'sync-matches',
  description:
    'Fetches World Cup matches from football-data.org daily and upserts match records (deduplicated by match name).',
  timeoutSeconds: 120,
  handler,
});
