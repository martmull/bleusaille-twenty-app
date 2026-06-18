import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

export const WINNER_BETS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '9716a909-8b75-4fd7-baa2-e8b24307f43d';

type WinnerBetGroup = {
  team: string;
  victoryChance: number | null;
  puntosIfVictory: number | null;
  footixs: string[];
};

type WinnerBetsResponse = { bets: WinnerBetGroup[] };

type Theme = {
  pageBackground: string;
  surface: string;
  border: string;
  borderSubtle: string;
  cardShadow: string;
  textPrimary: string;
  heading: string;
  muted: string;
  chipBackground: string;
  chipBorder: string;
  chipText: string;
  chanceChipBackground: string;
  chanceChipText: string;
  amber: string;
};

const getTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'dark'
    ? {
        pageBackground: 'linear-gradient(180deg, #1b1a26 0%, #131220 100%)',
        surface: '#21202c',
        border: '#34333f',
        borderSubtle: '#2b2a36',
        cardShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
        textPrimary: '#ececf1',
        heading: '#c9bff0',
        muted: '#9a98a8',
        chipBackground: 'linear-gradient(180deg, #4a3c18 0%, #5e4b1f 100%)',
        chipBorder: '#7c6526',
        chipText: '#ffd98a',
        chanceChipBackground: '#16323a',
        chanceChipText: '#7fd6e8',
        amber: '#fbbf24',
      }
    : {
        pageBackground: 'linear-gradient(180deg, #fbfbff 0%, #f1f0fa 100%)',
        surface: '#ffffff',
        border: '#eceaf3',
        borderSubtle: '#f0eef6',
        cardShadow: '0 2px 6px rgba(80, 60, 140, 0.06)',
        textPrimary: '#1a1a1a',
        heading: '#3a2f63',
        muted: '#9ca3af',
        chipBackground: 'linear-gradient(180deg, #fff6da 0%, #ffe9a8 100%)',
        chipBorder: '#f5d77a',
        chipText: '#7c5a12',
        chanceChipBackground: '#e6f6fa',
        chanceChipText: '#0e7490',
        amber: '#b45309',
      };

const KEYFRAMES = `
@keyframes wb-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes wb-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes wb-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
`;

const getResponsiveCss = (theme: Theme) => `
.wb-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 6px 11px;
  border-radius: 12px;
}
.wb-info {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 0 0 auto;
  min-width: 0;
}
.wb-team {
  display: flex;
  align-items: center;
  gap: 5px;
  flex: 0 0 auto;
  width: 120px;
  min-width: 0;
}
.wb-footixs {
  flex: 1 1 0;
  min-width: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-content: center;
  padding-left: 10px;
  border-left: 1px solid ${theme.borderSubtle};
}
@media (max-width: 520px) {
  .wb-card { flex-direction: column; align-items: stretch; gap: 8px; }
  .wb-info { width: 100%; justify-content: space-between; }
  .wb-team { flex: 1 1 auto; width: auto; }
  .wb-footixs {
    flex: 1 1 auto;
    width: 100%;
    padding-left: 0;
    border-left: none;
    padding-top: 8px;
    border-top: 1px solid ${theme.borderSubtle};
  }
}
`;

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const formatChance = (value: number | null): string =>
  value === null ? '–' : `${Math.round(value)}%`;

const formatPuntos = (value: number | null): string =>
  value === null ? '–' : `${value}`;

const Shell = ({ children }: { children: React.ReactNode }) => {
  const theme = getTheme(useColorScheme());

  return (
    <div
      style={{
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        padding: '12px',
        background: theme.pageBackground,
        fontFamily: FONT,
      }}
    >
      <style>{KEYFRAMES}{getResponsiveCss(theme)}</style>
      {children}
    </div>
  );
};

const RefreshButton = ({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) => {
  const theme = getTheme(useColorScheme());

  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={isRefreshing}
      aria-label="Refresh"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '22px',
        height: '22px',
        padding: 0,
        border: 'none',
        borderRadius: '6px',
        background: 'transparent',
        color: theme.muted,
        cursor: isRefreshing ? 'default' : 'pointer',
        fontSize: '14px',
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: 'inline-block',
          animation: isRefreshing ? 'wb-spin 0.8s linear infinite' : 'none',
        }}
      >
        ↻
      </span>
    </button>
  );
};

const FootixChip = ({ name, index }: { name: string; index: number }) => {
  const theme = getTheme(useColorScheme());

  return (
    <span
      style={{
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '999px',
        background: theme.chipBackground,
        border: `1px solid ${theme.chipBorder}`,
        fontSize: '11px',
        fontWeight: 700,
        color: theme.chipText,
        animation: `wb-pop 0.35s ${0.05 * index}s both`,
      }}
    >
      {name}
    </span>
  );
};

const BetCard = ({ bet, index }: { bet: WinnerBetGroup; index: number }) => {
  const theme = getTheme(useColorScheme());

  return (
    <div
      className="wb-card"
      style={{
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow,
        animation: `wb-rise 0.4s ${Math.min(index, 8) * 0.05}s both`,
      }}
    >
      <div className="wb-info">
        <div
          className="wb-team"
          style={{
            fontSize: '12px',
            fontWeight: 700,
            color: theme.textPrimary,
          }}
        >
          <span style={{ fontSize: '11px' }}>🏆</span>
          <span
            style={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {bet.team}
          </span>
        </div>

        <span
          style={{
            flex: '0 0 auto',
            padding: '2px 8px',
            borderRadius: '7px',
            background: theme.chanceChipBackground,
            fontSize: '12px',
            fontWeight: 800,
            color: theme.chanceChipText,
            whiteSpace: 'nowrap',
          }}
        >
          {formatChance(bet.victoryChance)}
        </span>

        <span
          style={{
            flex: '0 0 auto',
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '3px',
            whiteSpace: 'nowrap',
          }}
        >
          <span
            style={{
              fontSize: '9px',
              fontWeight: 800,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              color: theme.muted,
            }}
          >
            exp puntos
          </span>
          <span style={{ fontSize: '12px', fontWeight: 800, color: theme.amber }}>
            🪙 {formatPuntos(bet.puntosIfVictory)}
          </span>
        </span>
      </div>

      <div className="wb-footixs">
        {bet.footixs.map((name, footixIndex) => (
          <FootixChip key={name} name={name} index={footixIndex} />
        ))}
      </div>
    </div>
  );
};

const WinnerBets = () => {
  const theme = getTheme(useColorScheme());
  const [bets, setBets] = useState<WinnerBetGroup[] | null>(null);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clientRef = useRef<RestApiClient>();
  if (!clientRef.current) {
    clientRef.current = new RestApiClient();
  }

  const load = useCallback(() => {
    setIsRefreshing(true);
    clientRef
      .current!.get<WinnerBetsResponse>('/s/winner-bets')
      .then((response) => {
        setBets(response.bets);
        setError(false);
      })
      .catch(() => setError(true))
      .finally(() => setIsRefreshing(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Shell>
      {error && !bets ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>Bets unavailable</div>
      ) : !bets ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>…</div>
      ) : bets.length === 0 ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>No winner bet yet ⏳</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {bets.map((bet, index) => (
            <BetCard key={bet.team} bet={bet} index={index} />
          ))}
        </div>
      )}
    </Shell>
  );
};

export default defineFrontComponent({
  universalIdentifier: WINNER_BETS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Winner bets',
  description:
    'World Cup winner bets with each bet’s victory chance, expected puntos if it wins, and the list of footixs who picked it.',
  component: WinnerBets,
});
