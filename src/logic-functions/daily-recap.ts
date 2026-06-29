import { defineLogicFunction } from 'twenty-sdk/define';
import { runAgent, RoutePayload } from 'twenty-sdk/logic-function';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { createCoreApiClient, fetchAllRecords } from 'src/logic-functions/shared/api';
import {
  buildFallbackCopy,
  buildRecapFacts,
  RecapBetRecord,
  RecapCopy,
  RecapMatchRecord,
  RecapPersonRecord,
  utcDayStart,
} from 'src/logic-functions/shared/daily-recap';
import { DAILY_RECAP_WRITER_AGENT_UNIVERSAL_IDENTIFIER } from 'src/agents/daily-recap-writer';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MAX_BACKFILL_DAYS = 365;

const parseBackfillDays = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }
  return Math.min(parsed, MAX_BACKFILL_DAYS);
};

type DailyRecapRecord = { id: string; recapDate: string | null };

type DayResult = {
  recapDate: string;
  action: 'created' | 'updated';
  usedAgent: boolean;
};

const dayLabelFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const isRecapCopy = (value: unknown): value is RecapCopy =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RecapCopy).headline === 'string' &&
  typeof (value as RecapCopy).rankingMoves === 'string' &&
  typeof (value as RecapCopy).notableResults === 'string' &&
  typeof (value as RecapCopy).funFact === 'string' &&
  typeof (value as RecapCopy).mood === 'string';

const generateRecapForDay = async (
  client: CoreApiClient,
  matches: RecapMatchRecord[],
  bets: RecapBetRecord[],
  people: RecapPersonRecord[],
  existingRecaps: DailyRecapRecord[],
  dayStart: number,
): Promise<DayResult | null> => {
  const facts = buildRecapFacts(matches, bets, people, dayStart);

  if (facts.matches.length === 0) {
    return null;
  }

  const agentResponse = await runAgent({
    agentUniversalIdentifier: DAILY_RECAP_WRITER_AGENT_UNIVERSAL_IDENTIFIER,
    prompt: `Voici les faits de la veille au format JSON :\n${JSON.stringify(facts)}`,
  }).catch(() => null);

  const usedAgent = Boolean(agentResponse?.success);
  const copy: RecapCopy =
    agentResponse?.success && isRecapCopy(agentResponse.result)
      ? agentResponse.result
      : buildFallbackCopy(facts);

  const recapDate = new Date(dayStart).toISOString();
  const data = {
    name: `Récap — ${dayLabelFormatter.format(new Date(dayStart))}`,
    recapDate,
    headline: copy.headline,
    rankingMoves: copy.rankingMoves,
    notableResults: copy.notableResults,
    funFact: copy.funFact,
    mood: copy.mood,
  };

  const existing = existingRecaps.find(
    (recap) => recap.recapDate && new Date(recap.recapDate).getTime() === dayStart,
  );

  if (existing) {
    await client.mutation({
      updateDailyRecap: { __args: { id: existing.id, data }, id: true },
    } as never);
    return { recapDate, action: 'updated', usedAgent };
  }

  await client.mutation({
    createDailyRecap: { __args: { data }, id: true },
  } as never);
  return { recapDate, action: 'created', usedAgent };
};

const handler = async (event?: RoutePayload) => {
  const client = createCoreApiClient();
  const backfillDays = parseBackfillDays(event?.queryStringParameters?.backfill);

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
      puntevs: true,
      person: { id: true, name: { firstName: true } },
      match: { id: true, endDate: true, result: true },
    }),
    fetchAllRecords<RecapPersonRecord>(client, 'people', {
      id: true,
      name: { firstName: true },
      wcWinnerBet: true,
      victoryChance: true,
      winnerBetPuntosEv: true,
    }),
    fetchAllRecords<DailyRecapRecord>(client, 'dailyRecaps', {
      id: true,
      recapDate: true,
    }),
  ]);

  const todayStart = utcDayStart(Date.now());
  const yesterdayStart = todayStart - MS_PER_DAY;
  const dayStarts = Array.from(
    { length: backfillDays },
    (_, index) => yesterdayStart - index * MS_PER_DAY,
  );

  const recaps: DayResult[] = [];
  for (const dayStart of dayStarts) {
    const result = await generateRecapForDay(
      client,
      matches,
      bets,
      people,
      existingRecaps,
      dayStart,
    );
    if (result) {
      recaps.push(result);
    }
  }

  return {
    backfillDays,
    daysConsidered: dayStarts.length,
    processed: recaps.length,
    recaps,
  };
};

export default defineLogicFunction({
  universalIdentifier: 'f49c8fc0-5610-4dab-8f66-7005a2d21af6',
  name: 'daily-recap',
  description:
    'Builds a funny recap of the previous day (ranking moves, notable results, bettor fun facts) via an agent and stores it as a Daily Recap record. Runs every morning on a cron, can be triggered over HTTP, and accepts ?backfill=N to regenerate the last N days.',
  timeoutSeconds: 300,
  handler,
  cronTriggerSettings: {
    pattern: '0 7 * * *',
  },
  httpRouteTriggerSettings: {
    path: '/daily-recap',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
