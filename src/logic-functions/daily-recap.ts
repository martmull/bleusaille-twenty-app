import { defineLogicFunction } from 'twenty-sdk/define';
import { runAgent } from 'twenty-sdk/logic-function';

import { createCoreApiClient, fetchAllRecords } from 'src/logic-functions/shared/api';
import {
  buildFallbackCopy,
  buildRecapFacts,
  RecapBetRecord,
  RecapCopy,
  RecapMatchRecord,
  RecapPersonRecord,
} from 'src/logic-functions/shared/daily-recap';
import { DAILY_RECAP_WRITER_AGENT_UNIVERSAL_IDENTIFIER } from 'src/agents/daily-recap-writer';

type DailyRecapRecord = { id: string; recapDate: string | null };

const dayLabelFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const startOfYesterdayUtc = (now: number): number => {
  const date = new Date(now);
  const startOfToday = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
  );
  return startOfToday - 24 * 60 * 60 * 1000;
};

const isRecapCopy = (value: unknown): value is RecapCopy =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RecapCopy).headline === 'string' &&
  typeof (value as RecapCopy).rankingMoves === 'string' &&
  typeof (value as RecapCopy).notableResults === 'string' &&
  typeof (value as RecapCopy).funFact === 'string' &&
  typeof (value as RecapCopy).mood === 'string';

const handler = async () => {
  const client = createCoreApiClient();
  const dayStart = startOfYesterdayUtc(Date.now());

  const [matches, bets, people, existingRecaps] = await Promise.all([
    fetchAllRecords<RecapMatchRecord>(client, 'matches', {
      id: true,
      home: true,
      away: true,
      score: true,
      result: true,
      endDate: true,
      prematchHomeCote: true,
      prematchDrawCote: true,
      prematchAwayCote: true,
    }),
    fetchAllRecords<RecapBetRecord>(client, 'bets', {
      won: true,
      puntos: true,
      person: { id: true, name: { firstName: true } },
      match: { id: true, endDate: true, result: true },
    }),
    fetchAllRecords<RecapPersonRecord>(client, 'people', {
      id: true,
      name: { firstName: true },
    }),
    fetchAllRecords<DailyRecapRecord>(client, 'dailyRecaps', {
      id: true,
      recapDate: true,
    }),
  ]);

  const facts = buildRecapFacts(matches, bets, people, dayStart);

  if (facts.matches.length === 0) {
    return { skipped: true, reason: 'no matches played yesterday' };
  }

  const agentResponse = await runAgent({
    agentUniversalIdentifier: DAILY_RECAP_WRITER_AGENT_UNIVERSAL_IDENTIFIER,
    prompt: `Voici les faits de la veille au format JSON :\n${JSON.stringify(facts)}`,
  }).catch(() => null);

  const copy: RecapCopy =
    agentResponse?.success && isRecapCopy(agentResponse.result)
      ? agentResponse.result
      : buildFallbackCopy(facts);

  const dayLabel = dayLabelFormatter.format(new Date(dayStart));
  const recapDate = new Date(dayStart).toISOString();
  const data = {
    name: `Récap — ${dayLabel}`,
    recapDate,
    headline: copy.headline,
    rankingMoves: copy.rankingMoves,
    notableResults: copy.notableResults,
    funFact: copy.funFact,
    mood: copy.mood,
  };

  const existing = existingRecaps.find(
    (recap) =>
      recap.recapDate && new Date(recap.recapDate).getTime() === dayStart,
  );

  if (existing) {
    await client.mutation({
      updateDailyRecap: {
        __args: { id: existing.id, data },
        id: true,
      },
    } as never);
    return { updated: true, recapDate, usedAgent: Boolean(agentResponse?.success) };
  }

  await client.mutation({
    createDailyRecap: {
      __args: { data },
      id: true,
    },
  } as never);

  return { created: true, recapDate, usedAgent: Boolean(agentResponse?.success) };
};

export default defineLogicFunction({
  universalIdentifier: 'f49c8fc0-5610-4dab-8f66-7005a2d21af6',
  name: 'daily-recap',
  description:
    'Each morning, builds a funny recap of the previous day (ranking moves, notable results, bettor fun facts) via an agent and stores it as a Daily Recap record.',
  timeoutSeconds: 60,
  handler,
  cronTriggerSettings: {
    pattern: '0 7 * * *',
  },
});
