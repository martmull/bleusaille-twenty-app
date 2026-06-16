import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { computeBetsPuntos } from 'src/logic-functions/shared/steps/compute-puntos.step';

const handler = async () => computeBetsPuntos(createCoreApiClient());

export default defineLogicFunction({
  universalIdentifier: 'f11c6b01-cd8d-4a2a-87ec-2877f87673e6',
  name: 'compute-puntos',
  description: 'Computes and stores the puntos earned for each bet on a resolved match.',
  timeoutSeconds: 120,
  handler,
});
