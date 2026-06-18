import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { computeEv } from 'src/logic-functions/shared/steps/compute-ev.step';

type MatchRecord = {
  startDate: string | null;
  endDate: string | null;
  result: string | null;
};

const handler = async () => {
  const client = createCoreApiClient();

  const matches = await fetchAllPages<MatchRecord>(async (after) => {
    const { matches: page } = await client.query({
      matches: {
        __args: { first: PAGE_SIZE, after },
        edges: { node: { startDate: true, endDate: true, result: true } },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const now = Date.now();
  const hasInProgressMatch = matches.some(
    (match) =>
      !match.result &&
      match.startDate !== null &&
      new Date(match.startDate).getTime() <= now &&
      (match.endDate === null || new Date(match.endDate).getTime() >= now),
  );

  if (!hasInProgressMatch) {
    console.log('[compute-live-ev] no match in progress, skipping');
    return { skipped: true };
  }

  console.log('[compute-live-ev] match in progress, computing EV');
  const result = await computeEv(client);

  return { skipped: false, ...result };
};

export default defineLogicFunction({
  universalIdentifier: '7bf50d4c-3ead-4388-87ae-97246a7a819c',
  name: 'compute-live-ev',
  description:
    'Every minute, recomputes match quotes and bet EV while a match is in progress, to keep live odds fresh.',
  timeoutSeconds: 120,
  handler,
  cronTriggerSettings: {
    pattern: '* * * * *',
  },
});
