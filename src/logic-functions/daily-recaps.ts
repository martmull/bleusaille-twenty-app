import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllRecords } from 'src/logic-functions/shared/api';

type DailyRecapRecord = {
  recapDate: string | null;
  article: string | null;
};

type Recap = {
  recapDate: string | null;
  article: string;
};

const handler = async (): Promise<{ recaps: Recap[] }> => {
  const client = createCoreApiClient();

  const records = await fetchAllRecords<DailyRecapRecord>(client, 'dailyRecaps', {
    recapDate: true,
    article: true,
  });

  const recaps = records
    .filter((record) => (record.article ?? '').trim().length > 0)
    .sort(
      (a, b) =>
        new Date(b.recapDate ?? 0).getTime() - new Date(a.recapDate ?? 0).getTime(),
    )
    .map((record) => ({
      recapDate: record.recapDate,
      article: record.article ?? '',
    }));

  return { recaps };
};

export default defineLogicFunction({
  universalIdentifier: '304c4b46-0f6a-4aef-8700-66af31b24d4b',
  name: 'daily-recaps',
  description: 'Returns the stored Daily Recaps, newest first, for the front component feed.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/daily-recaps',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
