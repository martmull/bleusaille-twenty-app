import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { settleBets } from 'src/logic-functions/shared/steps/settle-bets.step';

const handler = async () => settleBets(createCoreApiClient());

export default defineLogicFunction({
  universalIdentifier: '35bf4d9a-e148-4d4f-a5e8-2cf1d38af949',
  name: 'settle-bets',
  description: 'Marks each bet as won or lost by comparing its prediction with the match result.',
  timeoutSeconds: 120,
  handler,
});
