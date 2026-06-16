import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { importBettors } from 'src/logic-functions/shared/steps/import-bettors.step';

const handler = async () => importBettors(createCoreApiClient());

export default defineLogicFunction({
  universalIdentifier: 'f42b38b7-a5df-480c-ab57-c6b12ae10283',
  name: 'import-bettors',
  description:
    'Imports the kicktipp players as People records (deduplicated by name). Intended to be run manually.',
  timeoutSeconds: 300,
  handler,
});
