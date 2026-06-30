import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

export const DAILY_RECAP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '7c250a38-2e54-4b68-8473-a96b98da814f';

type Recap = {
  recapDate: string | null;
  headline: string;
  article: string;
  rankingMoves: string;
  notableResults: string;
  funFact: string;
  mood: string;
};

type RecapsResponse = { recaps: Recap[] };

type Theme = {
  pageBackground: string;
  surface: string;
  border: string;
  cardShadow: string;
  textPrimary: string;
  heading: string;
  muted: string;
  accent: string;
  sectionLabel: string;
  paperLine: string;
  dropCap: string;
  chipBg: string;
};

const getTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'dark'
    ? {
        pageBackground: 'linear-gradient(180deg, #1b1a26 0%, #131220 100%)',
        surface: '#21202c',
        border: '#34333f',
        cardShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
        textPrimary: '#ececf1',
        heading: '#c9bff0',
        muted: '#9a98a8',
        accent: '#fbbf24',
        sectionLabel: '#8f8ca6',
        paperLine: '#2f2e3a',
        dropCap: '#c9bff0',
        chipBg: '#2b2a36',
      }
    : {
        pageBackground: 'linear-gradient(180deg, #fbfbff 0%, #f1f0fa 100%)',
        surface: '#ffffff',
        border: '#eceaf3',
        cardShadow: '0 4px 18px rgba(80, 60, 140, 0.10)',
        textPrimary: '#23222b',
        heading: '#3a2f63',
        muted: '#9ca3af',
        accent: '#b45309',
        sectionLabel: '#a59fc0',
        paperLine: '#e4e1ef',
        dropCap: '#6d28d9',
        chipBg: '#f4f2fb',
      };

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
const SERIF = 'Georgia, "Times New Roman", serif';

const KEYFRAMES = `
@keyframes dr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes dr-rise { from { opacity: 0; transform: translateY(14px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dr-pop { 0% { transform: scale(0.4) rotate(-14deg); opacity: 0; } 70% { transform: scale(1.18) rotate(6deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
@keyframes dr-wobble { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
@keyframes dr-shimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
@keyframes dr-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 100% { transform: translateY(360px) rotate(320deg); opacity: 0; } }
@keyframes dr-bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
@keyframes dr-gradient { 0% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } 100% { background-position: 0% 50%; } }
`;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const dateLabelOf = (recapDate: string | null): string =>
  recapDate ? dateFormatter.format(new Date(recapDate)) : 'Jour inconnu';

const CONFETTI = ['⚽', '🎉', '🏆', '✨', '🥅', '🎊'];

const Confetti = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      overflow: 'hidden',
      pointerEvents: 'none',
      zIndex: 0,
    }}
  >
    {Array.from({ length: 14 }).map((_, index) => (
      <span
        key={index}
        style={{
          position: 'absolute',
          top: '-24px',
          left: `${(index * 7.3 + 3) % 100}%`,
          fontSize: `${11 + (index % 4) * 3}px`,
          opacity: 0.7,
          animation: `dr-fall ${4 + (index % 5)}s linear ${(index % 7) * 0.6}s infinite`,
        }}
      >
        {CONFETTI[index % CONFETTI.length]}
      </span>
    ))}
  </div>
);

const GIF_BY_MOOD: Record<string, string> = {
  '🤯': 'https://media.giphy.com/media/26ufdipQ68Yu0zXEY/giphy.gif',
  '🔥': 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif',
  '😱': 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
  '💀': 'https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif',
  '😴': 'https://media.giphy.com/media/aLdiZJmmx4OVW/giphy.gif',
  '🎉': 'https://media.giphy.com/media/g9582DNuQppxC/giphy.gif',
};
const DEFAULT_GIF = 'https://media.giphy.com/media/3o7TKsQ8UQ0Mc47jVm/giphy.gif';

const gifFor = (mood: string): string => GIF_BY_MOOD[mood] ?? DEFAULT_GIF;

const MoodGif = ({ mood }: { mood: string }) => {
  const theme = getTheme(useColorScheme());
  const [broken, setBroken] = useState(false);

  if (broken) {
    return null;
  }

  return (
    <img
      src={gifFor(mood)}
      alt=""
      onError={() => setBroken(true)}
      style={{
        width: '100%',
        height: '88px',
        objectFit: 'cover',
        borderRadius: '10px',
        border: `1px solid ${theme.border}`,
        display: 'block',
      }}
    />
  );
};

const Highlight = ({ icon, text }: { icon: string; text: string }) => {
  const theme = getTheme(useColorScheme());
  if (!text) {
    return null;
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'flex-start',
        gap: '5px',
        padding: '5px 9px',
        borderRadius: '9px',
        background: theme.chipBg,
        fontSize: '11px',
        lineHeight: 1.4,
        color: theme.textPrimary,
      }}
    >
      <span style={{ flex: '0 0 auto' }}>{icon}</span>
      <span>{text}</span>
    </span>
  );
};

const Article = ({ text }: { text: string }) => {
  const theme = getTheme(useColorScheme());
  const trimmed = text.trim();

  if (!trimmed) {
    return null;
  }

  const first = trimmed.charAt(0);
  const rest = trimmed.slice(1);

  return (
    <p
      style={{
        margin: 0,
        fontFamily: SERIF,
        fontSize: '13.5px',
        lineHeight: 1.62,
        color: theme.textPrimary,
        textAlign: 'justify',
      }}
    >
      <span
        style={{
          float: 'left',
          fontFamily: SERIF,
          fontSize: '38px',
          lineHeight: '34px',
          fontWeight: 700,
          paddingRight: '7px',
          marginTop: '2px',
          color: theme.dropCap,
        }}
      >
        {first}
      </span>
      {rest}
    </p>
  );
};

const RecapCard = ({ recap, index }: { recap: Recap; index: number }) => {
  const theme = getTheme(useColorScheme());

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        gap: '11px',
        padding: '15px 16px',
        borderRadius: '16px',
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow,
        animation: `dr-rise 0.5s ${Math.min(index, 8) * 0.07}s both`,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '11px' }}>
        <span
          style={{
            flex: '0 0 auto',
            fontSize: '30px',
            lineHeight: 1,
            transformOrigin: '50% 80%',
            animation: `dr-pop 0.55s ${Math.min(index, 8) * 0.07 + 0.1}s both, dr-wobble 2.8s ease-in-out ${Math.min(index, 8) * 0.07 + 0.7}s infinite`,
          }}
        >
          {recap.mood || '📰'}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', minWidth: 0 }}>
          <span
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              letterSpacing: '0.8px',
              textTransform: 'uppercase',
              color: theme.muted,
            }}
          >
            {dateLabelOf(recap.recapDate)}
          </span>
          <span
            style={{
              fontFamily: SERIF,
              fontSize: '17px',
              fontWeight: 700,
              lineHeight: 1.2,
              color: theme.heading,
            }}
          >
            {recap.headline}
          </span>
        </div>
      </div>

      <MoodGif mood={recap.mood} />

      <Article text={recap.article} />

      {recap.rankingMoves || recap.notableResults || recap.funFact ? (
        <>
          <span style={{ height: '1px', width: '100%', background: theme.paperLine }} />
          <div
            style={{
              fontSize: '9.5px',
              fontWeight: 800,
              letterSpacing: '0.7px',
              textTransform: 'uppercase',
              color: theme.sectionLabel,
            }}
          >
            En bref
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            <Highlight icon="📊" text={recap.rankingMoves} />
            <Highlight icon="⚡" text={recap.notableResults} />
            <Highlight icon="🎲" text={recap.funFact} />
          </div>
        </>
      ) : null}
    </div>
  );
};

const Header = ({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) => {
  const theme = getTheme(useColorScheme());

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '12px',
        padding: '10px 12px',
        borderRadius: '12px',
        background:
          'linear-gradient(110deg, #6d28d9, #b45309, #2563eb, #6d28d9)',
        backgroundSize: '300% 300%',
        animation: 'dr-gradient 9s ease infinite',
        boxShadow: theme.cardShadow,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '7px',
          fontSize: '15px',
          fontWeight: 800,
          fontFamily: SERIF,
          color: '#fff',
          textShadow: '0 1px 3px rgba(0,0,0,0.35)',
        }}
      >
        <span style={{ display: 'inline-block', animation: 'dr-bob 1.6s ease-in-out infinite' }}>
          ⚽
        </span>
        La Gazette de la Bleusaille
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Refresh"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: 0,
          border: 'none',
          borderRadius: '7px',
          background: 'rgba(255,255,255,0.18)',
          color: '#fff',
          cursor: isRefreshing ? 'default' : 'pointer',
          fontSize: '14px',
          lineHeight: 1,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            animation: isRefreshing ? 'dr-spin 0.8s linear infinite' : 'none',
          }}
        >
          ↻
        </span>
      </button>
    </div>
  );
};

const Shell = ({ children }: { children: React.ReactNode }) => {
  const theme = getTheme(useColorScheme());

  return (
    <div
      style={{
        position: 'relative',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        overflowY: 'auto',
        padding: '12px',
        background: theme.pageBackground,
        fontFamily: FONT,
      }}
    >
      <style>{KEYFRAMES}</style>
      <Confetti />
      <div style={{ position: 'relative', zIndex: 1 }}>{children}</div>
    </div>
  );
};

const DailyRecap = () => {
  const theme = getTheme(useColorScheme());
  const [recaps, setRecaps] = useState<Recap[] | null>(null);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clientRef = useRef<RestApiClient>();
  if (!clientRef.current) {
    clientRef.current = new RestApiClient();
  }

  const load = useCallback(() => {
    setIsRefreshing(true);
    clientRef
      .current!.get<RecapsResponse>('/s/daily-recaps')
      .then((response) => {
        setRecaps(response.recaps);
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
      <Header onRefresh={load} isRefreshing={isRefreshing} />

      {error && !recaps ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>Gazette indisponible</div>
      ) : !recaps ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>…</div>
      ) : recaps.length === 0 ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>
          Pas encore d'édition, reviens demain matin ☕
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recaps.map((recap, index) => (
            <RecapCard
              key={`${recap.recapDate ?? 'unknown'}-${index}`}
              recap={recap}
              index={index}
            />
          ))}
        </div>
      )}
    </Shell>
  );
};

export default defineFrontComponent({
  universalIdentifier: DAILY_RECAP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Daily Recap',
  description:
    'A lively newspaper-style feed of the daily recaps: animated header, confetti, a mood GIF and a long-form funny article, newest first.',
  component: DailyRecap,
});
