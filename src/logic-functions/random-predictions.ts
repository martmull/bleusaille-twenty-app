import { defineLogicFunction, RoutePayload } from 'twenty-sdk/define';

import {
  createCoreApiClient,
  fetchAllPages,
  PAGE_SIZE,
  round2,
} from 'src/logic-functions/shared/api';
import {
  debugTippabgabe,
  KicktippSubmissionResult,
  submitKicktippTips,
} from 'src/logic-functions/shared/kicktipp';
import { fetchMatchResultChances } from 'src/logic-functions/shared/odds';
import {
  OutcomeProbabilities,
  pickWeightedOutcome,
} from 'src/logic-functions/shared/random-prediction';
import {
  canonicalTeamName,
  teamPairKey,
} from 'src/logic-functions/shared/team-aliases';
import { BetValue } from 'src/objects/bet.object';

type MatchRecord = {
  id: string;
  name: string | null;
  home: string | null;
  away: string | null;
  startDate: string | null;
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

const handler = async (event: RoutePayload) => {
  if (parseBoolean(event.queryStringParameters?.debug)) {
    return debugTippabgabe();
  }

  const count = parseCount(event.queryStringParameters?.count);
  const submit = parseBoolean(event.queryStringParameters?.submit);
  const client = createCoreApiClient();

  const [chancesByPair, matches] = await Promise.all([
    fetchMatchResultChances(),
    fetchAllPages<MatchRecord>(async (after) => {
      const { matches: page } = await client.query({
        matches: {
          __args: { first: PAGE_SIZE, after },
          edges: {
            node: {
              id: true,
              name: true,
              home: true,
              away: true,
              startDate: true,
            },
          },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });
      return page;
    }),
  ]);

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
    const chance = chancesByPair.get(teamPairKey(home, away));

    if (!chance) {
      continue;
    }

    const homeProbability =
      homeBonus*(chance.teamProbabilities.get(canonicalTeamName(home)) ?? 0);
    const awayProbability =
      awayBonus*(chance.teamProbabilities.get(canonicalTeamName(away)) ?? 0);
    const drawProbability = drawBonus*chance.drawProbability;

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
        home: round2(chance.teamPrices.get(canonicalTeamName(home)) ?? 0),
        draw: round2(chance.drawPrice),
        away: round2(chance.teamPrices.get(canonicalTeamName(away)) ?? 0),
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
    'Returns randomized result predictions for the next N upcoming matches, weighted by live bookmaker odds.',
  timeoutSeconds: 30,
  handler,
  httpRouteTriggerSettings: {
    path: '/random-predictions',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
