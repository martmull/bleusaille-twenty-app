import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

export const LIVE_MATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'f306edd5-83c4-4177-b8a5-e846d92152ac';

const POLL_INTERVAL_MS = 30_000;

type LiveMatchState = 'LIVE' | 'HALF_TIME' | 'UPCOMING';

type OutcomeBets = {
  ev: number | null;
  users: string[];
};

type Outcomes = {
  home: OutcomeBets;
  draw: OutcomeBets;
  away: OutcomeBets;
};

type OutcomeKey = 'home' | 'draw' | 'away';

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
  outcomes?: Outcomes;
};

const OUTCOME_STYLE: Record<
  OutcomeKey,
  { betLabel: string; chipBg: string; chipText: string }
> = {
  home: { betLabel: '1', chipBg: '#d8f3e1', chipText: '#15803d' },
  draw: { betLabel: '0', chipBg: '#e9eaed', chipText: '#6b7280' },
  away: { betLabel: '2', chipBg: '#fbdcdc', chipText: '#dc2626' },
};

const OUTCOME_ORDER: OutcomeKey[] = ['home', 'draw', 'away'];

const formatEv = (ev: number | null): string => (ev === null ? '—' : ev.toFixed(1));

const longestOutcome = (outcomes: Outcomes): OutcomeKey | null => {
  let longest: OutcomeKey | null = null;
  for (const key of OUTCOME_ORDER) {
    const count = outcomes[key].users.length;
    if (count > 0 && (longest === null || count > outcomes[longest].users.length)) {
      longest = key;
    }
  }
  return longest;
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
@keyframes live-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
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

const BetChip = ({ style }: { style: { betLabel: string; chipBg: string; chipText: string } }) => (
  <span
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      minWidth: '28px',
      padding: '3px 10px',
      borderRadius: '7px',
      background: style.chipBg,
      color: style.chipText,
      fontSize: '17px',
      fontWeight: 800,
    }}
  >
    {style.betLabel}
  </span>
);

const NameChip = ({ name, index }: { name: string; index: number }) => (
  <span
    style={{
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: '999px',
      background: 'linear-gradient(180deg, #fff6da 0%, #ffe9a8 100%)',
      border: '1px solid #f5d77a',
      fontSize: '11px',
      fontWeight: 700,
      color: '#7c5a12',
      animation: `live-pop 0.35s ${0.05 * index}s both`,
    }}
  >
    {name}
  </span>
);

const OutcomeColumn = ({
  outcome,
  style,
  collapsed,
}: {
  outcome: OutcomeBets;
  style: { betLabel: string; chipBg: string; chipText: string };
  collapsed: boolean;
}) => (
  <div
    style={{
      flex: '1 1 0',
      minWidth: 0,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '7px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <BetChip style={style} />
      <span style={{ fontSize: '16px', fontWeight: 800, color: '#1a1a1a', lineHeight: 1 }}>
        {formatEv(outcome.ev)}
      </span>
    </div>
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'flex-start',
        gap: '4px',
        width: '100%',
        minWidth: 0,
      }}
    >
      {outcome.users.length === 0 ? (
        <span style={{ fontSize: '11px', color: '#c4c0d6' }}>—</span>
      ) : collapsed ? (
        <>
          {outcome.users.slice(0, 3).map((name, index) => (
            <NameChip key={name} name={name} index={index} />
          ))}
          {outcome.users.length > 3 ? (
            <span style={{ width: '100%', fontSize: '11px', fontWeight: 700, color: '#9ca3af' }}>
              ... {outcome.users.length - 3} others
            </span>
          ) : null}
        </>
      ) : (
        outcome.users.map((name, index) => <NameChip key={name} name={name} index={index} />)
      )}
    </div>
  </div>
);

const BetsSection = ({ outcomes }: { outcomes: Outcomes }) => {
  const collapsedKey = longestOutcome(outcomes);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        gap: '12px',
        width: '100%',
      }}
    >
      {OUTCOME_ORDER.map((key, index) => (
        <Fragment key={key}>
          {index > 0 ? (
            <span
              style={{ flex: '0 0 auto', alignSelf: 'stretch', width: '1px', background: '#eceaf3' }}
            />
          ) : null}
          <OutcomeColumn
            outcome={outcomes[key]}
            style={OUTCOME_STYLE[key]}
            collapsed={key === collapsedKey}
          />
        </Fragment>
      ))}
    </div>
  );
};

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
        overflowY: 'auto',
        background: '#ffffff',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <style>{KEYFRAMES}</style>
      <div
        style={{
          flexShrink: 0,
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
            flexShrink: 0,
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
          flexShrink: 0,
          marginTop: 'auto',
          marginBottom: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
        }}
      >
        <div
          style={{
            flex: '0 0 auto',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
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
        {data.outcomes ? (
          <>
            <div style={{ flex: '0 0 auto', height: '1px', background: '#eceaf3' }} />
            <BetsSection outcomes={data.outcomes} />
          </>
        ) : null}
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
