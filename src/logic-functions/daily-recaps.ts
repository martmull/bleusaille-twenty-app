import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllRecords } from 'src/logic-functions/shared/api';

type DailyRecapRecord = {
  recapDate: string | null;
  headline: string | null;
  article: string | null;
  rankingMoves: string | null;
  notableResults: string | null;
  funFact: string | null;
  mood: string | null;
};

type Recap = {
  recapDate: string | null;
  headline: string;
  article: string;
  rankingMoves: string;
  notableResults: string;
  funFact: string;
  mood: string;
};

const handler = async (): Promise<{ recaps: Recap[] }> => {
  const client = createCoreApiClient();

  const records = await fetchAllRecords<DailyRecapRecord>(client, 'dailyRecaps', {
    recapDate: true,
    headline: true,
    article: true,
    rankingMoves: true,
    notableResults: true,
    funFact: true,
    mood: true,
  });

  const recaps = records
    .sort(
      (a, b) =>
        new Date(b.recapDate ?? 0).getTime() - new Date(a.recapDate ?? 0).getTime(),
    )
    .map((record) => ({
      recapDate: record.recapDate,
      headline: record.headline ?? '',
      article: record.article ?? '',
      rankingMoves: record.rankingMoves ?? '',
      notableResults: record.notableResults ?? '',
      funFact: record.funFact ?? '',
      mood: record.mood ?? '📰',
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
