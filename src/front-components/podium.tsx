import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useEffect, useState } from 'react';
import { useColorScheme } from "twenty-sdk/front-component";

export const PODIUM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '99057cf8-165e-4cdd-8be7-d217e7b1fd8d';

type PodiumEntry = {
  rank: number;
  puntos: number;
  names: string[];
  winnings: number | null;
};
const eurFormatter = new Intl.NumberFormat('fr-FR', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

type PodiumResponse = { podium: PodiumEntry[] };

type Theme = {
  pageBackground: string;
  textPrimary: string;
  textMuted: string;
  textFaint: string;
  positive: string;
};

const getTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'dark'
    ? {
        pageBackground: 'linear-gradient(180deg, #1b1a26 0%, #131220 100%)',
        textPrimary: '#ececf1',
        textMuted: '#9a98a8',
        textFaint: '#6c6a7d',
        positive: '#34d399',
      }
    : {
        pageBackground: 'linear-gradient(180deg, #fbfbff 0%, #f1f0fa 100%)',
        textPrimary: '#1a1a1a',
        textMuted: '#888',
        textFaint: '#aaa',
        positive: '#16a34a',
      };

const MEDALS = ['🥇', '🥈', '🥉'];
const BAR_COLORS = ['#FFD24A', '#CBD0D8', '#E29A5B'];
const BAR_TOP_COLORS = ['#FFE89A', '#E8ECF2', '#F2C397'];
const BAR_HEIGHTS = [72, 52, 38];
const RISE_DELAYS = ['0.45s', '0.25s', '0.05s'];
const TAGLINES = ['Le Boss incontesté', 'Si proche du trône…', 'Mais bien là quand même'];
// Display order left → right: 2nd, 1st, 3rd
const DISPLAY_ORDER = [2, 1, 3];

const CONFETTI = [
  { left: '8%', delay: '0s', emoji: '🎉' },
  { left: '20%', delay: '1.1s', emoji: '✨' },
  { left: '34%', delay: '0.5s', emoji: '🎊' },
  { left: '46%', delay: '1.6s', emoji: '⭐' },
  { left: '58%', delay: '0.3s', emoji: '🎉' },
  { left: '70%', delay: '1.3s', emoji: '✨' },
  { left: '82%', delay: '0.8s', emoji: '🎊' },
  { left: '92%', delay: '1.9s', emoji: '⭐' },
];

const KEYFRAMES = `
@keyframes podium-slide-up { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes podium-pop { 0% { transform: scale(0) rotate(-30deg); opacity: 0; } 70% { transform: scale(1.25) rotate(8deg); } 100% { transform: scale(1) rotate(0); opacity: 1; } }
@keyframes podium-bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-7px); } }
@keyframes podium-glow { 0%, 100% { box-shadow: 0 0 6px rgba(255,210,74,0.4); } 50% { box-shadow: 0 0 22px rgba(255,210,74,0.95); } }
@keyframes podium-confetti { 0% { transform: translateY(-14px) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(180px) rotate(380deg); opacity: 0; } }
`;

const PodiumColumn = ({ entry, theme }: { entry: PodiumEntry; theme: Theme }) => {
  const i = entry.rank - 1;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        width: '31%',
      }}
    >
      <div
        style={{
          fontSize: '24px',
          animation: `podium-pop 0.6s ${RISE_DELAYS[i]} both, podium-bounce 2s ${RISE_DELAYS[i]} infinite`,
        }}
      >
        {MEDALS[i]}
      </div>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '1px',
          marginTop: '2px',
          maxWidth: '100%',
        }}
      >
        {entry.names.map((name) => (
          <div
            key={name}
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: theme.textPrimary,
              lineHeight: '1.2',
              maxWidth: '100%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {name}
          </div>
        ))}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 600, color: theme.textMuted }}>{entry.puntos} pts</div>
      {entry.winnings !== null && entry.winnings > 0 && (
        <div style={{ fontSize: '12px', fontWeight: 800, color: theme.positive, marginTop: '1px' }}>
          💶 {eurFormatter.format(entry.winnings)}
        </div>
      )}
      <div style={{ fontSize: '8px', color: theme.textFaint, fontStyle: 'italic', marginBottom: '3px' }}>
        {TAGLINES[i]}
      </div>
      <div style={{ height: `${BAR_HEIGHTS[i]}px`, width: '100%', overflow: 'hidden' }}>
        <div
          style={{
            height: '100%',
            width: '100%',
            borderRadius: '8px 8px 0 0',
            background: `linear-gradient(180deg, ${BAR_TOP_COLORS[i]} 0%, ${BAR_COLORS[i]} 100%)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '28px',
            fontWeight: 800,
            color: 'rgba(0,0,0,0.55)',
            transform: 'translateY(100%)',
            animation: `podium-slide-up 0.7s ${RISE_DELAYS[i]} cubic-bezier(0.2,0.8,0.2,1) forwards${
              entry.rank === 1 ? ', podium-glow 1.8s 1.2s ease-in-out infinite' : ''
            }`,
          }}
        >
          {entry.rank}
        </div>
      </div>
    </div>
  );
};

const Podium = () => {
  const theme = getTheme(useColorScheme());
  const [podium, setPodium] = useState<PodiumEntry[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const client = new RestApiClient();
    client
      .get<PodiumResponse>('/s/podium')
      .then((data) => setPodium(data.podium))
      .catch(() => setError(true));
  }, []);

  const byRank = (rank: number) => podium?.find((entry) => entry.rank === rank);

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        height: '100%',
        width: '100%',
        overflow: 'hidden',
        boxSizing: 'border-box',
        padding: '10px 12px',
        background: theme.pageBackground,
        fontFamily:
          'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{KEYFRAMES}</style>

      {podium &&
        CONFETTI.map((c, idx) => (
          <div
            key={idx}
            style={{
              position: 'absolute',
              top: 0,
              left: c.left,
              fontSize: '12px',
              animation: `podium-confetti 2.6s ${c.delay} ease-in infinite`,
              pointerEvents: 'none',
            }}
          >
            {c.emoji}
          </div>
        ))}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center',
          gap: '6px',
          width: '100%',
          flex: 1,
          zIndex: 1,
        }}
      >
        {error && <span style={{ fontSize: '12px', color: theme.textMuted }}>Unavailable</span>}
        {!error && !podium && <span style={{ fontSize: '12px', color: theme.textMuted }}>…</span>}
        {podium &&
          DISPLAY_ORDER.map((rank) => {
            const entry = byRank(rank);
            return entry ? <PodiumColumn key={rank} entry={entry} theme={theme} /> : null;
          })}
      </div>
    </div>
  );
};

export default defineFrontComponent({
  universalIdentifier: PODIUM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Podium',
  description: 'Animated podium celebrating the top 3 players by puntos.',
  component: Podium,
});
