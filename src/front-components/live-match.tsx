import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { useCallback, useEffect, useRef, useState } from 'react';

export const LIVE_MATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'f306edd5-83c4-4177-b8a5-e846d92152ac';

const POLL_INTERVAL_MS = 30_000;

type LiveMatchState = 'LIVE' | 'HALF_TIME' | 'UPCOMING';

type LiveMatchResponse = {
  found: boolean;
  state?: LiveMatchState;
  home?: string;
  away?: string;
  homeScore?: number | null;
  awayScore?: number | null;
  startDate?: string;
  stageLabel?: string;
  groupLabel?: string | null;
};

const kickoffFormatter = new Intl.DateTimeFormat('fr-FR', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

const KEYFRAMES = `
@keyframes live-dot-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.8); } }
@keyframes live-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
`;

const formatAge = (seconds: number): string =>
  seconds < 60 ? `since ${seconds}s` : `since ${Math.floor(seconds / 60)}min`;

const RefreshFooter = ({
  lastRefreshedAt,
  now,
  onRefresh,
  isRefreshing,
  stale,
}: {
  lastRefreshedAt: number | null;
  now: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  stale: boolean;
}) => {
  const seconds =
    lastRefreshedAt !== null ? Math.max(0, Math.floor((now - lastRefreshedAt) / 1000)) : null;

  return (
    <div
      style={{
        position: 'absolute',
        top: '8px',
        right: '10px',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '11px',
        color: stale ? '#b45309' : '#9ca3af',
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>
        {seconds === null ? '—' : formatAge(seconds)}
        {stale ? ' · hors ligne' : ''}
      </span>
      <button
        type="button"
        onClick={onRefresh}
        disabled={isRefreshing}
        aria-label="Actualiser"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          padding: 0,
          border: 'none',
          borderRadius: '6px',
          background: 'transparent',
          color: 'inherit',
          cursor: isRefreshing ? 'default' : 'pointer',
          fontSize: '14px',
          lineHeight: 1,
        }}
      >
        <span
          style={{
            display: 'inline-block',
            animation: isRefreshing ? 'live-spin 0.8s linear infinite' : 'none',
          }}
        >
          ↻
        </span>
      </button>
    </div>
  );
};

const StatusBadge = ({ data }: { data: LiveMatchResponse }) => {
  if (data.state === 'UPCOMING') {
    return (
      <span style={{ fontSize: '13px', fontWeight: 700, color: '#6b7280', letterSpacing: '0.2px' }}>
        À venir
      </span>
    );
  }

  const label = data.state === 'HALF_TIME' ? 'Mi-temps' : 'En direct';

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '13px',
        fontWeight: 800,
        color: '#15803d',
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: '#16a34a',
          animation: 'live-dot-pulse 1.2s ease-in-out infinite',
        }}
      />
      {label}
    </span>
  );
};

const TeamName = ({ name, align }: { name: string; align: 'right' | 'left' }) => (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      textAlign: align,
      fontSize: '18px',
      fontWeight: 700,
      color: '#1a1a1a',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {name}
  </div>
);

const Scoreboard = ({
  data,
  footer,
}: {
  data: LiveMatchResponse;
  footer: React.ReactNode;
}) => {
  const isUpcoming = data.state === 'UPCOMING';
  const context = [data.stageLabel, data.groupLabel].filter(Boolean).join(' · ');

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        boxSizing: 'border-box',
        padding: '16px 20px',
        background: '#ffffff',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        style={{
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: 500,
          color: '#6b7280',
        }}
      >
        <StatusBadge data={data} />
      </div>
      {context ? (
        <div
          style={{
            textAlign: 'center',
            marginTop: '2px',
            fontSize: '11px',
            fontWeight: 500,
            color: '#9ca3af',
          }}
        >
          {context}
        </div>
      ) : null}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          minHeight: 0,
        }}
      >
        <TeamName name={data.home ?? ''} align="right" />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '14px',
            color: '#1a1a1a',
            whiteSpace: 'nowrap',
          }}
        >
          {isUpcoming ? (
            <span style={{ fontSize: '15px', fontWeight: 700, color: '#6b7280' }}>
              {data.startDate ? kickoffFormatter.format(new Date(data.startDate)) : ''}
            </span>
          ) : (
            <>
              <span style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1 }}>
                {data.homeScore ?? 0}
              </span>
              <span style={{ fontSize: '30px', fontWeight: 400, color: '#9ca3af' }}>-</span>
              <span style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1 }}>
                {data.awayScore ?? 0}
              </span>
            </>
          )}
        </div>
        <TeamName name={data.away ?? ''} align="left" />
      </div>
      {footer}
    </div>
  );
};

const Centered = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      padding: '16px',
      background: '#ffffff',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      color: '#9ca3af',
    }}
  >
    {children}
  </div>
);

const LiveMatch = () => {
  const [data, setData] = useState<LiveMatchResponse | null>(null);
  const [error, setError] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const clientRef = useRef<RestApiClient>();
  if (!clientRef.current) {
    clientRef.current = new RestApiClient();
  }

  const load = useCallback(() => {
    setIsRefreshing(true);
    clientRef
      .current!.get<LiveMatchResponse>('/s/live-match')
      .then((response) => {
        setData(response);
        setError(false);
        setLastRefreshedAt(Date.now());
      })
      .catch(() => setError(true))
      .finally(() => setIsRefreshing(false));
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [load]);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  if (error && !data) {
    return <Centered>Score indisponible</Centered>;
  }

  if (!data) {
    return <Centered>…</Centered>;
  }

  if (!data.found) {
    return <Centered>Aucun match</Centered>;
  }

  return (
    <Scoreboard
      data={data}
      footer={
        <RefreshFooter
          lastRefreshedAt={lastRefreshedAt}
          now={now}
          onRefresh={load}
          isRefreshing={isRefreshing}
          stale={error}
        />
      }
    />
  );
};

export default defineFrontComponent({
  universalIdentifier: LIVE_MATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Live Match',
  description: 'Live score of the in-progress World Cup match, or the next upcoming match.',
  component: LiveMatch,
});
