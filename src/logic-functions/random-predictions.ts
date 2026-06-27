import { defineLogicFunction, RoutePayload } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllRecords, round2 } from 'src/logic-functions/shared/api';
import {
  debugTippabgabe,
  KicktippSubmissionResult,
  submitKicktippTips,
} from 'src/logic-functions/shared/kicktipp';
import {
  OutcomeProbabilities,
  pickWeightedOutcome,
} from 'src/logic-functions/shared/random-prediction';
import { computeEv } from 'src/logic-functions/shared/steps/compute-ev.step';
import { BetValue } from 'src/objects/bet.object';

type MatchRecord = {
  id: string;
  name: string | null;
  home: string | null;
  away: string | null;
  startDate: string | null;
  homeQuote: number | null;
  drawQuote: number | null;
  awayQuote: number | null;
};

const BET_VALUE_LABELS: Record<BetValue, string> = {
  [BetValue.HOME_WIN]: '1',
  [BetValue.NULL_OR_DRAW]: '0',
  [BetValue.AWAY_WIN]: '2',
};

const homeBonus = 1.00
const drawBonus= 1.20
const awayBonus= 0.85

const DEFAULT_COUNT = 1;

const parseCount = (raw: string | undefined): number => {
  const parsed = Number.parseInt(raw ?? '', 10);
  return Number.isInteger(parsed) && parsed >= 1 ? parsed : DEFAULT_COUNT;
};

const toPercentage = (probability: number): number =>
  Math.round(probability * 1000) / 10;

const parseBoolean = (raw: string | undefined): boolean =>
  (raw ?? '').toLowerCase() === 'true';

const quotesToProbabilities = (
  home: number | null,
  draw: number | null,
  away: number | null,
): OutcomeProbabilities | null => {
  const homeInverse = home && home > 0 ? 1 / home : 0;
  const drawInverse = draw && draw > 0 ? 1 / draw : 0;
  const awayInverse = away && away > 0 ? 1 / away : 0;
  const total = homeInverse + drawInverse + awayInverse;

  if (total === 0) {
    return null;
  }

  return {
    home: homeInverse / total,
    draw: drawInverse / total,
    away: awayInverse / total,
  };
};

const handler = async (event: RoutePayload) => {
  if (parseBoolean(event.queryStringParameters?.debug)) {
    return debugTippabgabe();
  }

  const count = parseCount(event.queryStringParameters?.count);
  const submit = parseBoolean(event.queryStringParameters?.submit);
  const refreshCotes = parseBoolean(event.queryStringParameters?.refreshCotes);
  const client = createCoreApiClient();

  if (refreshCotes) {
    await computeEv(client);
  }

  const matches = await fetchAllRecords<MatchRecord>(client, 'matches', {
    id: true,
    name: true,
    home: true,
    away: true,
    startDate: true,
    homeQuote: true,
    drawQuote: true,
    awayQuote: true,
  });

  const now = Date.now();

  const upcoming = matches
    .filter(
      (match) =>
        match.home &&
        match.away &&
        match.startDate &&
        new Date(match.startDate).getTime() > now,
    )
    .sort(
      (a, b) =>
        new Date(a.startDate as string).getTime() -
        new Date(b.startDate as string).getTime(),
    );

  const predictions: Array<{
    matchId: string;
    name: string | null;
    home: string;
    away: string;
    startDate: string;
    quotes: { home: number; draw: number; away: number };
    probabilities: { home: number; draw: number; away: number };
    prediction: BetValue;
    label: string;
  }> = [];

  for (const match of upcoming) {
    if (predictions.length >= count) {
      break;
    }

    const home = match.home as string;
    const away = match.away as string;

    const baseProbabilities = quotesToProbabilities(
      match.homeQuote,
      match.drawQuote,
      match.awayQuote,
    );

    if (!baseProbabilities) {
      continue;
    }

    const homeProbability = homeBonus * baseProbabilities.home;
    const awayProbability = awayBonus * baseProbabilities.away;
    const drawProbability = drawBonus * baseProbabilities.draw;

    const probabilities: OutcomeProbabilities = {
      home: homeProbability,
      draw: drawProbability,
      away: awayProbability,
    };

    const prediction = pickWeightedOutcome(probabilities);

    predictions.push({
      matchId: match.id,
      name: match.name,
      home,
      away,
      startDate: match.startDate as string,
      quotes: {
        home: round2(match.homeQuote ?? 0),
        draw: round2(match.drawQuote ?? 0),
        away: round2(match.awayQuote ?? 0),
      },
      probabilities: {
        home: toPercentage(homeProbability),
        draw: toPercentage(drawProbability),
        away: toPercentage(awayProbability),
      },
      prediction,
      label: BET_VALUE_LABELS[prediction],
    });
  }

  let kicktipp: KicktippSubmissionResult | null = null;

  if (predictions.length > 0) {
    kicktipp = await submitKicktippTips(
      predictions.map((prediction) => ({
        home: prediction.home,
        away: prediction.away,
        betValue: prediction.prediction,
      })),
      !submit,
    );
  }

  return {
    count: predictions.length,
    predictions,
    kicktipp: { dryRun: !submit, ...kicktipp },
  };
};

export default defineLogicFunction({
  universalIdentifier: 'fc58b370-2c82-450e-aea2-d0046cc5d838',
  name: 'random-predictions',
  description:
    'Returns randomized result predictions for the next N upcoming matches, weighted by the cotes stored on each match. Pass refreshCotes=true to recompute the cotes before predicting.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/random-predictions',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
