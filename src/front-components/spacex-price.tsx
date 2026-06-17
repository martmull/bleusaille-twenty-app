import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useCallback, useEffect, useState } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

export const SPACEX_PRICE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'f99a6140-0f6b-4d1a-b841-a1629febbbbf';

// --- Computing constants (edit these as the bet evolves) ---
const CONTRIBUTION_PER_PERSON_EUR = 30;
const ENTRY_PRICE_USD = 167.05;
const COUNTERPARTY_NAME = 'Tony';

const REFRESH_PRICE_INTERVAL_IN_SECONDS = 5

type Theme = {
  gain: string;
  loss: string;
  neutral: string;
  muted: string;
  panelBackground: string;
  panelBorder: string;
  panelShadow: string;
};

const getTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'dark'
    ? {
        gain: '#34d399',
        loss: '#f87171',
        neutral: '#ececf1',
        muted: '#9a98a8',
        panelBackground: '#2a2937',
        panelBorder: '#34333f',
        panelShadow: '0 1px 2px rgba(0, 0, 0, 0.45)',
      }
    : {
        gain: '#16a34a',
        loss: '#dc2626',
        neutral: '#1a1a1a',
        muted: '#888',
        panelBackground: '#f7f7f8',
        panelBorder: '#ececef',
        panelShadow: '0 1px 2px rgba(0, 0, 0, 0.04)',
      };

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

const colorOf = (value: number, theme: Theme) => (value >= 0 ? theme.gain : theme.loss);
const signedEur = (value: number) =>
  `${value >= 0 ? '+' : '−'}${eurFormatter.format(Math.abs(value))}`;
const signedPct = (value: number) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(1)}%`;

const SpacexPrice = () => {
  const theme = getTheme(useColorScheme());
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
    <span style={{ fontSize: '13px', color: theme.neutral }}>{error ? 'Unavailable' : '…'}</span>
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
      color: theme.muted,
    } as const;
    const heroValue = { fontSize: '30px', fontWeight: 700, lineHeight: '1.1' } as const;
    const heroSub = { fontSize: '13px', fontWeight: 600 } as const;
    const labelCell = {
      fontSize: '13px',
      color: theme.muted,
      padding: '2px 10px 2px 0',
      whiteSpace: 'nowrap',
    } as const;
    const valueCell = {
      fontSize: '13px',
      color: theme.neutral,
      fontWeight: 600,
      padding: '2px 0',
      textAlign: 'right',
    } as const;

    body = (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: 0 }}>
        <div
          style={{
            backgroundColor: theme.panelBackground,
            border: `1px solid ${theme.panelBorder}`,
            borderRadius: '10px',
            padding: '10px 14px',
            boxShadow: theme.panelShadow,
            boxSizing: 'border-box',
          }}
        >
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <tbody>
          <tr>
            <td style={labelCell}>SpaceX (SPCX)</td>
            <td style={valueCell}>
              {eurFormatter.format(price.priceEur)}{' '}
              <span style={{ color: theme.muted, fontWeight: 400 }}>
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'stretch', gap: '12px', flex: 1, minHeight: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flex: 1, minHeight: 0 }}>
            <span style={heroLabel}>POT VALUE</span>
            <span style={{ ...heroValue, color: colorOf(potProfitEur, theme) }}>
              {eurFormatter.format(potValueEur)}
            </span>
            <span style={{ ...heroSub, color: colorOf(potProfitEur, theme) }}>
              {signedEur(potProfitEur)} ({signedPct(potProfitPct)})
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', alignItems: 'flex-end', flex: 1, minHeight: 0 }}>
            <span style={heroLabel}>{COUNTERPARTY_NAME.toUpperCase()}</span>
            <span style={{ ...heroValue, color: colorOf(counterpartyEur, theme) }}>
              {signedEur(counterpartyEur)}
            </span>
            <span style={{ ...heroSub, color: colorOf(counterpartyEur, theme) }}>
              {signedPct(counterpartyPct)}
            </span>
          </div>
        </div>
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
