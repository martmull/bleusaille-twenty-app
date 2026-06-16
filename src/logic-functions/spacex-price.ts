import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';

const SPACEX_SYMBOL = 'SPCX';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

type YahooMeta = {
  regularMarketPrice?: number;
  currency?: string;
  shortName?: string;
};

const fetchYahooMeta = async (symbol: string): Promise<YahooMeta> => {
  const response = await fetch(`${YAHOO_CHART_URL}/${symbol}?interval=1d&range=1d`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    throw new Error(`Yahoo request failed for ${symbol}: ${response.status}`);
  }

  const json = (await response.json()) as {
    chart: { result: Array<{ meta: YahooMeta }> | null; error: unknown };
  };

  const meta = json.chart.result?.[0]?.meta;

  if (!meta) {
    throw new Error(`Yahoo returned no data for ${symbol}`);
  }

  return meta;
};

const handler = async () => {
  const client = createCoreApiClient();

  const [spacex, eurUsd, peopleResult] = await Promise.all([
    fetchYahooMeta(SPACEX_SYMBOL),
    fetchYahooMeta('EURUSD=X'),
    client.query({ people: { __args: { first: 1 }, totalCount: true } }),
  ]);

  const priceUsd = spacex.regularMarketPrice;
  const eurUsdRate = eurUsd.regularMarketPrice;

  if (typeof priceUsd !== 'number' || typeof eurUsdRate !== 'number' || eurUsdRate === 0) {
    throw new Error('Missing price or FX rate');
  }

  const priceEur = priceUsd / eurUsdRate;

  return {
    symbol: SPACEX_SYMBOL,
    name: spacex.shortName ?? 'SpaceX',
    priceUsd,
    priceEur,
    eurUsdRate,
    currency: 'EUR',
    participantCount: peopleResult.people.totalCount,
  };
};

export default defineLogicFunction({
  universalIdentifier: 'cb11836c-2b3c-46c3-a567-f83858f0449d',
  name: 'spacex-price',
  description: 'Returns the SpaceX (SPCX) spot price converted to euros.',
  timeoutSeconds: 20,
  handler,
  httpRouteTriggerSettings: {
    path: '/spacex-price',
    httpMethod: 'GET',
    isAuthRequired: false,
  },
});
