import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useCallback, useEffect, useState } from 'react';

export const SPACEX_PRICE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'f99a6140-0f6b-4d1a-b841-a1629febbbbf';

// --- Computing constants (edit these as the bet evolves) ---
const CONTRIBUTION_PER_PERSON_EUR = 30;
const ENTRY_PRICE_USD = 167.05;
const COUNTERPARTY_NAME = 'Tony';
const GAIN_COLOR = '#16a34a';
const LOSS_COLOR = '#dc2626';
const NEUTRAL_COLOR = '#1a1a1a';
const MUTED_COLOR = '#888';

const REFRESH_PRICE_INTERVAL_IN_SECONDS = 5

type SpacexPriceResponse = {
  symbol: string;
  name: string;
  priceUsd: number;
  priceEur: number;
  eurUsdRate: number;
  participantCount: number;
};

const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
});

const colorOf = (value: number) => (value >= 0 ? GAIN_COLOR : LOSS_COLOR);
const signedEur = (value: number) =>
  `${value >= 0 ? '+' : '−'}${eurFormatter.format(Math.abs(value))}`;
const signedPct = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;

const SpacexPrice = () => {
  const [price, setPrice] = useState<SpacexPriceResponse | null>(null);
  const [error, setError] = useState(false);

  const fetchPrice = useCallback(() => {
    setError(false);
    const client = new RestApiClient();
    client
      .get<SpacexPriceResponse>('/s/spacex-price')
      .then((data) => setPrice(data))
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    fetchPrice();
    const interval = setInterval(fetchPrice, REFRESH_PRICE_INTERVAL_IN_SECONDS * 1_000);
    return () => clearInterval(interval);
  }, [fetchPrice]);

  let body: React.ReactNode = (
    <span style={{ fontSize: '13px', color: NEUTRAL_COLOR }}>{error ? 'Unavailable' : '…'}</span>
  );

  if (price) {
    const potStakeEur = CONTRIBUTION_PER_PERSON_EUR * price.participantCount;
    const ratio = price.priceUsd / ENTRY_PRICE_USD;
    const potValueEur = potStakeEur * ratio;
    const potProfitEur = potValueEur - potStakeEur;
    const potProfitPct = (ratio - 1) * 100;
    const counterpartyEur = -potProfitEur;
    const counterpartyPct = -potProfitPct;

    const heroLabel = {
      fontSize: '11px',
      fontWeight: 700,
      letterSpacing: '0.5px',
      color: MUTED_COLOR,
    } as const;
    const heroValue = { fontSize: '30px', fontWeight: 700, lineHeight: '1.1' } as const;
    const heroSub = { fontSize: '13px', fontWeight: 600 } as const;
    const labelCell = {
      fontSize: '13px',
      color: MUTED_COLOR,
      padding: '2px 10px 2px 0',
      whiteSpace: 'nowrap',
    } as const;
    const valueCell = {
      fontSize: '13px',
      color: NEUTRAL_COLOR,
      fontWeight: 600,
      padding: '2px 0',
      textAlign: 'right',
    } as const;

    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={heroLabel}>POT VALUE</span>
            <span style={{ ...heroValue, color: colorOf(potProfitEur) }}>
              {eurFormatter.format(potValueEur)}
            </span>
            <span style={{ ...heroSub, color: colorOf(potProfitEur) }}>
              {signedEur(potProfitEur)} ({signedPct(potProfitPct)})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end' }}>
            <span style={heroLabel}>{COUNTERPARTY_NAME.toUpperCase()}</span>
            <span style={{ ...heroValue, color: colorOf(counterpartyEur) }}>
              {signedEur(counterpartyEur)}
            </span>
            <span style={{ ...heroSub, color: colorOf(counterpartyEur) }}>
              {signedPct(counterpartyPct)}
            </span>
          </div>
        </div>

        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
            <tr>
              <td style={labelCell}>SpaceX (SPCX)</td>
              <td style={valueCell}>
                {eurFormatter.format(price.priceEur)}{' '}
                <span style={{ color: MUTED_COLOR, fontWeight: 400 }}>
                  ${price.priceUsd.toFixed(2)}
                </span>
              </td>
            </tr>
            <tr>
              <td style={labelCell}>Entry price</td>
              <td style={valueCell}>${ENTRY_PRICE_USD.toFixed(2)}</td>
            </tr>
            <tr>
              <td style={labelCell}>
                Pot stake ({CONTRIBUTION_PER_PERSON_EUR}€ × {price.participantCount})
              </td>
              <td style={valueCell}>{eurFormatter.format(potStakeEur)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        padding: '10px',
        boxSizing: 'border-box',
        gap: '6px',
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {body}
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: SPACEX_PRICE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'POT',
  description: 'SpaceX (SPCX) price in euros with pot value and the counterparty option P&L.',
  component: SpacexPrice,
});
