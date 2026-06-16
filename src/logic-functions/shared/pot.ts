const SPACEX_SYMBOL = 'SPCX';
const YAHOO_CHART_URL = 'https://query1.finance.yahoo.com/v8/finance/chart';

export const CONTRIBUTION_PER_PERSON_EUR = 30;
export const ENTRY_PRICE_USD = 167.05;

export const fetchSpacexPriceUsd = async (): Promise<number> => {
  const response = await fetch(`${YAHOO_CHART_URL}/${SPACEX_SYMBOL}?interval=1d&range=1d`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
  });

  if (!response.ok) {
    throw new Error(`Yahoo request failed for ${SPACEX_SYMBOL}: ${response.status}`);
  }

  const json = (await response.json()) as {
    chart: { result: Array<{ meta: { regularMarketPrice?: number } }> | null };
  };

  const price = json.chart.result?.[0]?.meta?.regularMarketPrice;

  if (typeof price !== 'number') {
    throw new Error(`Yahoo returned no price for ${SPACEX_SYMBOL}`);
  }

  return price;
};

export const computePotValueEur = (priceUsd: number, participantCount: number): number =>
  CONTRIBUTION_PER_PERSON_EUR * participantCount * (priceUsd / ENTRY_PRICE_USD);
