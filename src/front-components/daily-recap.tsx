import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

export const DAILY_RECAP_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '7c250a38-2e54-4b68-8473-a96b98da814f';

type Recap = {
  recapDate: string | null;
  article: string;
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
};

const getTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'dark'
    ? {
        pageBackground: 'linear-gradient(180deg, #1b1a26 0%, #131220 100%)',
        surface: '#21202c',
        border: '#34333f',
        cardShadow: '0 2px 6px rgba(0, 0, 0, 0.4)',
        textPrimary: '#ececf1',
        heading: '#c9bff0',
        muted: '#9a98a8',
        accent: '#fbbf24',
        sectionLabel: '#8f8ca6',
        paperLine: '#2f2e3a',
      }
    : {
        pageBackground: 'linear-gradient(180deg, #fbfbff 0%, #f1f0fa 100%)',
        surface: '#ffffff',
        border: '#eceaf3',
        cardShadow: '0 2px 6px rgba(80, 60, 140, 0.06)',
        textPrimary: '#1a1a1a',
        heading: '#3a2f63',
        muted: '#9ca3af',
        accent: '#b45309',
        sectionLabel: '#a59fc0',
        paperLine: '#e4e1ef',
      };

const FONT = 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const KEYFRAMES = `
@keyframes dr-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes dr-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes dr-pop { 0% { transform: scale(0.5) rotate(-12deg); opacity: 0; } 70% { transform: scale(1.15) rotate(4deg); } 100% { transform: scale(1) rotate(0deg); opacity: 1; } }
`;

const dateFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  timeZone: 'UTC',
});

const dateLabelOf = (recapDate: string | null): string =>
  recapDate ? dateFormatter.format(new Date(recapDate)) : 'Jour inconnu';

// Renders inline markdown: **bold** and `code`-free plain text. Emojis are
// just unicode characters, so they pass through untouched.
const renderInline = (text: string, theme: Theme): React.ReactNode[] =>
  text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
      return (
        <strong key={index} style={{ fontWeight: 700, color: theme.heading }}>
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={index}>{part}</span>;
  });

// A tiny dependency-free markdown renderer tuned for the gazette article:
// ## / ### headings, "- " bullet lists, **bold**, and plain paragraphs.
const Markdown = ({ source }: { source: string }) => {
  const theme = getTheme(useColorScheme());
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  const blocks: React.ReactNode[] = [];
  let bullets: string[] = [];

  const flushBullets = () => {
    if (bullets.length === 0) {
      return;
    }
    const items = bullets;
    bullets = [];
    blocks.push(
      <ul
        key={`ul-${blocks.length}`}
        style={{
          margin: 0,
          paddingLeft: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
        }}
      >
        {items.map((item, index) => (
          <li
            key={index}
            style={{ fontSize: '12.5px', lineHeight: 1.45, color: theme.textPrimary }}
          >
            {renderInline(item, theme)}
          </li>
        ))}
      </ul>,
    );
  };

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    const trimmed = line.trim();

    if (trimmed === '') {
      flushBullets();
      continue;
    }

    const bulletMatch = trimmed.match(/^[-*•]\s+(.*)$/);
    if (bulletMatch) {
      bullets.push(bulletMatch[1]);
      continue;
    }

    flushBullets();

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const isTitle = level <= 2;
      blocks.push(
        <div
          key={`h-${blocks.length}`}
          style={{
            fontSize: isTitle ? '15px' : '11px',
            fontWeight: 800,
            lineHeight: 1.25,
            letterSpacing: isTitle ? 0 : '0.5px',
            textTransform: isTitle ? 'none' : 'uppercase',
            color: isTitle ? theme.heading : theme.sectionLabel,
            marginTop: blocks.length === 0 ? 0 : '4px',
          }}
        >
          {renderInline(headingMatch[2], theme)}
        </div>,
      );
      continue;
    }

    blocks.push(
      <p
        key={`p-${blocks.length}`}
        style={{ margin: 0, fontSize: '12.5px', lineHeight: 1.5, color: theme.textPrimary }}
      >
        {renderInline(trimmed, theme)}
      </p>,
    );
  }

  flushBullets();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>{blocks}</div>
  );
};

const RecapCard = ({ recap, index }: { recap: Recap; index: number }) => {
  const theme = getTheme(useColorScheme());

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        padding: '13px 14px',
        borderRadius: '14px',
        background: theme.surface,
        border: `1px solid ${theme.border}`,
        boxShadow: theme.cardShadow,
        animation: `dr-rise 0.45s ${Math.min(index, 8) * 0.06}s both`,
      }}
    >
      <span
        style={{
          fontSize: '9.5px',
          fontWeight: 800,
          letterSpacing: '0.7px',
          textTransform: 'uppercase',
          color: theme.muted,
        }}
      >
        {dateLabelOf(recap.recapDate)}
      </span>

      <span style={{ height: '1px', width: '100%', background: theme.paperLine }} />

      <Markdown source={recap.article} />
    </div>
  );
};

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
      <style>{KEYFRAMES}</style>
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
          animation: isRefreshing ? 'dr-spin 0.8s linear infinite' : 'none',
        }}
      >
        ↻
      </span>
    </button>
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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '10px',
        }}
      >
        <span style={{ fontSize: '14px', fontWeight: 800, color: theme.heading }}>
          📰 La Gazette de la Bleusaille
        </span>
        <RefreshButton onRefresh={load} isRefreshing={isRefreshing} />
      </div>

      {error && !recaps ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>Gazette indisponible</div>
      ) : !recaps ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>…</div>
      ) : recaps.length === 0 ? (
        <div style={{ fontSize: '13px', color: theme.muted }}>
          Pas encore d'édition, reviens demain matin ☕
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
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
    'A fun newspaper-style feed of the daily recaps: each day a free-form markdown chronicle, newest first.',
  component: DailyRecap,
});
