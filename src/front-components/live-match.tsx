import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

export const LIVE_MATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  'f306edd5-83c4-4177-b8a5-e846d92152ac';

const LIVE_POLL_INTERVAL_MS = 30_000;
const IDLE_POLL_INTERVAL_MS = 120_000;

type LiveMatchState = 'LIVE' | 'HALF_TIME' | 'UPCOMING';

type OutcomeUser = {
  name: string;
  newPuntos: number;
  newRank: number;
  rankDelta: number;
};

type OutcomeBets = {
  ev: number | null;
  payout: number;
  probability: number | null;
  quote: number | null;
  breakeven: number | null;
  users: OutcomeUser[];
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
  dataSource?: 'sportscore' | 'football-data';
};

type LeaderboardEntry = {
  name: string;
  newPuntos: number;
  newRank: number;
  rankDelta: number;
};

type MatchOddsResponse = {
  found: boolean;
  outcomes?: Outcomes;
  provisionalLeaderboard?: LeaderboardEntry[];
};

type ChipStyle = { betLabel: string; chipBg: string; chipText: string };

type Theme = {
  surface: string;
  textPrimary: string;
  muted: string;
  subtle: string;
  faint: string;
  positive: string;
  positiveDot: string;
  negative: string;
  amber: string;
  border: string;
  goldChipBackground: string;
  goldChipBorder: string;
  goldChipText: string;
  outcomeChips: Record<OutcomeKey, { chipBg: string; chipText: string }>;
};

const getTheme = (scheme: 'light' | 'dark'): Theme =>
  scheme === 'dark'
    ? {
        surface: '#21202c',
        textPrimary: '#ececf1',
        muted: '#9a98a8',
        subtle: '#8a8896',
        faint: '#6e6c7e',
        positive: '#4ade80',
        positiveDot: '#34d399',
        negative: '#f87171',
        amber: '#fbbf24',
        border: '#34333f',
        goldChipBackground: 'linear-gradient(180deg, #4a3c18 0%, #5e4b1f 100%)',
        goldChipBorder: '#7c6526',
        goldChipText: '#ffd98a',
        outcomeChips: {
          home: { chipBg: '#13321e', chipText: '#4ade80' },
          draw: { chipBg: '#2b2a37', chipText: '#a1a1ad' },
          away: { chipBg: '#3a1d1d', chipText: '#f87171' },
        },
      }
    : {
        surface: '#ffffff',
        textPrimary: '#1a1a1a',
        muted: '#9ca3af',
        subtle: '#6b7280',
        faint: '#7e7a96',
        positive: '#15803d',
        positiveDot: '#16a34a',
        negative: '#dc2626',
        amber: '#b45309',
        border: '#eceaf3',
        goldChipBackground: 'linear-gradient(180deg, #fff6da 0%, #ffe9a8 100%)',
        goldChipBorder: '#f5d77a',
        goldChipText: '#7c5a12',
        outcomeChips: {
          home: { chipBg: '#d8f3e1', chipText: '#15803d' },
          draw: { chipBg: '#e9eaed', chipText: '#6b7280' },
          away: { chipBg: '#fbdcdc', chipText: '#dc2626' },
        },
      };

const OUTCOME_BET_LABEL: Record<OutcomeKey, string> = {
  home: '1',
  draw: '0',
  away: '2',
};

const OUTCOME_ORDER: OutcomeKey[] = ['home', 'draw', 'away'];

const formatEv = (ev: number | null): string => (ev === null ? '—' : ev.toFixed(1));

const formatRankDelta = (delta: number): string =>
  delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '=';

const formatProbability = (probability: number | null): string =>
  probability === null ? '' : `${Math.round(probability * 100)}%`;

const formatQuoteBreakeven = (quote: number | null, breakeven: number | null): string => {
  const parts: string[] = [];
  if (quote !== null) {
    parts.push(quote.toFixed(2));
  }
  if (breakeven !== null) {
    parts.push(`${breakeven} BE`);
  }
  return parts.length > 0 ? ` (${parts.join(' · ')})` : '';
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
.lm-bets-wrap { container-type: inline-size; width: 100%; }
.lm-bets { display: flex; flex-direction: row; align-items: flex-start; justify-content: center; gap: 12px; width: 100%; }
.lm-bets-sep { flex: 0 0 auto; align-self: stretch; width: 1px; }
.lm-outcome { container-type: inline-size; flex: 1 1 0; min-width: 0; }
.lm-outcome-header { display: flex; flex-direction: row; align-items: center; flex-wrap: wrap; gap: 8px; }
@container (max-width: 420px) {
  .lm-bets { flex-direction: column; align-items: stretch; }
  .lm-bets-sep { align-self: auto; width: 100%; height: 1px; }
  .lm-outcome { flex: 0 0 auto; width: 100%; }
}
@container (max-width: 150px) {
  .lm-outcome-header { flex-direction: column; align-items: flex-start; gap: 4px; }
  .lm-outcome-sep { display: none; }
}
`;

const formatAge = (seconds: number): string =>
  seconds < 60 ? `since ${seconds}s` : `since ${Math.floor(seconds / 60)}min`;

const DATA_SOURCE_LABEL: Record<'sportscore' | 'football-data', string> = {
  sportscore: 'sportscore',
  'football-data': 'football-data',
};

const RefreshFooter = ({
  lastRefreshedAt,
  now,
  onRefresh,
  isRefreshing,
  stale,
  dataSource,
}: {
  lastRefreshedAt: number | null;
  now: number;
  onRefresh: () => void;
  isRefreshing: boolean;
  stale: boolean;
  dataSource?: 'sportscore' | 'football-data';
}) => {
  const theme = getTheme(useColorScheme());
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
        color: stale ? theme.amber : theme.muted,
      }}
    >
      <span style={{ whiteSpace: 'nowrap' }}>
        {seconds === null ? '—' : formatAge(seconds)}
        {dataSource ? ` · ${DATA_SOURCE_LABEL[dataSource]}` : ''}
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
  const theme = getTheme(useColorScheme());

  if (data.state === 'UPCOMING') {
    return (
      <span style={{ fontSize: '13px', fontWeight: 700, color: theme.subtle, letterSpacing: '0.2px' }}>
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
        color: theme.positive,
      }}
    >
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: theme.positiveDot,
          animation: 'live-dot-pulse 1.2s ease-in-out infinite',
        }}
      />
      {label}
    </span>
  );
};

const TeamName = ({ name, align }: { name: string; align: 'right' | 'left' }) => {
  const theme = getTheme(useColorScheme());

  return (
  <div
    style={{
      flex: 1,
      minWidth: 0,
      textAlign: align,
      fontSize: '18px',
      fontWeight: 700,
      color: theme.textPrimary,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }}
  >
    {name}
  </div>
  );
};

const BetChip = ({ style }: { style: ChipStyle }) => (
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

const UserRow = ({ user, index }: { user: OutcomeUser; index: number }) => {
  const theme = getTheme(useColorScheme());
  const deltaColor =
    user.rankDelta > 0 ? theme.positive : user.rankDelta < 0 ? theme.negative : theme.muted;

  return (
    <tr style={{ animation: `live-pop 0.35s ${0.05 * index}s both` }}>
      <td
        style={{
          width: '100%',
          maxWidth: 0,
          padding: '2px 6px 2px 0',
          fontSize: '14px',
          fontWeight: 700,
          color: theme.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {user.name}
      </td>
      <td
        style={{
          padding: '2px 6px 2px 0',
          fontSize: '13px',
          fontWeight: 800,
          color: theme.goldChipText,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {user.newPuntos}
      </td>
      <td
        style={{
          padding: '2px 5px 2px 0',
          fontSize: '13px',
          color: theme.muted,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        #{user.newRank}
      </td>
      <td
        style={{
          padding: '2px 0',
          fontSize: '13px',
          fontWeight: 800,
          color: deltaColor,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {formatRankDelta(user.rankDelta)}
      </td>
    </tr>
  );
};

const OutcomeColumn = ({ outcome, style }: { outcome: OutcomeBets; style: ChipStyle }) => {
  const theme = getTheme(useColorScheme());

  return (
  <div
    className="lm-outcome"
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      gap: '8px',
    }}
  >
    <div className="lm-outcome-header">
      <BetChip style={style} />
      <span
        className="lm-outcome-sep"
        style={{ flex: '0 0 auto', alignSelf: 'stretch', width: '1px', background: theme.border }}
      />
      <span style={{ fontSize: '18px', fontWeight: 800, color: theme.textPrimary, lineHeight: 1 }}>
        {formatEv(outcome.ev)}
      </span>
      {outcome.probability !== null ? (
        <span style={{ fontSize: '14px', fontWeight: 700, color: theme.subtle, lineHeight: 1 }}>
          {formatProbability(outcome.probability)}
          <span style={{ fontWeight: 500, color: theme.faint }}>
            {formatQuoteBreakeven(outcome.quote, outcome.breakeven)}
          </span>
        </span>
      ) : null}
      {outcome.users.length > 0 ? (
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '1px 7px',
            borderRadius: '999px',
            background: theme.goldChipBackground,
            border: `1px solid ${theme.goldChipBorder}`,
            fontSize: '13px',
            fontWeight: 800,
            color: theme.goldChipText,
          }}
        >
          +{outcome.payout}
        </span>
      ) : null}
    </div>
    {outcome.users.length === 0 ? (
      <span style={{ fontSize: '13px', color: theme.faint }}>—</span>
    ) : (
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <tbody>
          {outcome.users.map((user, index) => (
            <UserRow key={user.name} user={user} index={index} />
          ))}
        </tbody>
      </table>
    )}
  </div>
  );
};

const BetsSection = ({
  outcomes,
  leaderboard,
}: {
  outcomes: Outcomes;
  leaderboard: LeaderboardEntry[] | null;
}) => {
  const theme = getTheme(useColorScheme());

  return (
    <div className="lm-bets-wrap">
      <div className="lm-bets">
        {OUTCOME_ORDER.map((key, index) => (
          <Fragment key={key}>
            {index > 0 ? (
              <span className="lm-bets-sep" style={{ background: theme.border }} />
            ) : null}
            <OutcomeColumn
              outcome={outcomes[key]}
              style={{ betLabel: OUTCOME_BET_LABEL[key], ...theme.outcomeChips[key] }}
            />
          </Fragment>
        ))}
        {leaderboard && leaderboard.length > 0 ? (
          <>
            <span className="lm-bets-sep" style={{ background: theme.border }} />
            <LeaderboardColumn entries={leaderboard} />
          </>
        ) : null}
      </div>
    </div>
  );
};

const LeaderboardRow = ({ entry, index }: { entry: LeaderboardEntry; index: number }) => {
  const theme = getTheme(useColorScheme());
  const deltaColor =
    entry.rankDelta > 0 ? theme.positive : entry.rankDelta < 0 ? theme.negative : theme.muted;

  return (
    <tr style={{ animation: `live-pop 0.35s ${0.03 * index}s both` }}>
      <td
        style={{
          width: '100%',
          maxWidth: 0,
          padding: '2px 6px 2px 0',
          fontSize: '14px',
          fontWeight: 700,
          color: theme.textPrimary,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.name}
      </td>
      <td
        style={{
          padding: '2px 6px 2px 0',
          fontSize: '13px',
          fontWeight: 800,
          color: theme.goldChipText,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.newPuntos}
      </td>
      <td
        style={{
          padding: '2px 5px 2px 0',
          fontSize: '13px',
          color: theme.muted,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        #{entry.newRank}
      </td>
      <td
        style={{
          padding: '2px 0',
          fontSize: '13px',
          fontWeight: 800,
          color: deltaColor,
          textAlign: 'right',
          whiteSpace: 'nowrap',
        }}
      >
        {formatRankDelta(entry.rankDelta)}
      </td>
    </tr>
  );
};

const LeaderboardColumn = ({ entries }: { entries: LeaderboardEntry[] }) => {
  const theme = getTheme(useColorScheme());

  return (
    <div
      className="lm-outcome"
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '8px' }}
    >
      <span
        style={{
          fontSize: '11px',
          fontWeight: 700,
          letterSpacing: '0.4px',
          textTransform: 'uppercase',
          color: theme.subtle,
        }}
      >
        Current standings
      </span>
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'auto' }}>
        <tbody>
          {entries.map((entry, index) => (
            <LeaderboardRow key={`${entry.name}-${entry.newRank}`} entry={entry} index={index} />
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Scoreboard = ({
  data,
  outcomes,
  leaderboard,
  footer,
}: {
  data: LiveMatchResponse;
  outcomes: Outcomes | null;
  leaderboard: LeaderboardEntry[] | null;
  footer: React.ReactNode;
}) => {
  const theme = getTheme(useColorScheme());
  const isUpcoming = data.state === 'UPCOMING';
  const context = data.stageLabel ?? '';

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
        background: theme.surface,
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
          color: theme.subtle,
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
            color: theme.muted,
          }}
        >
          {context}
        </div>
      ) : null}
      <div
        style={{
          flexShrink: 0,
          marginTop: '16px',
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
            color: theme.textPrimary,
            whiteSpace: 'nowrap',
          }}
        >
          {isUpcoming ? (
            <span style={{ fontSize: '15px', fontWeight: 700, color: theme.subtle }}>
              {data.startDate ? kickoffFormatter.format(new Date(data.startDate)) : ''}
            </span>
          ) : (
            <>
              <span style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1 }}>
                {data.homeScore ?? 0}
              </span>
              <span style={{ fontSize: '30px', fontWeight: 400, color: theme.muted }}>-</span>
              <span style={{ fontSize: '44px', fontWeight: 800, lineHeight: 1 }}>
                {data.awayScore ?? 0}
              </span>
            </>
          )}
        </div>
          <TeamName name={data.away ?? ''} align="left" />
        </div>
        {outcomes ? (
          <>
            <div style={{ flex: '0 0 auto', height: '1px', background: theme.border }} />
            <BetsSection outcomes={outcomes} leaderboard={leaderboard} />
          </>
        ) : null}
      </div>
      {footer}
    </div>
  );
};

const Centered = ({ children }: { children: React.ReactNode }) => {
  const theme = getTheme(useColorScheme());

  return (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      padding: '16px',
      background: theme.surface,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      fontSize: '14px',
      color: theme.muted,
    }}
  >
    {children}
  </div>
  );
};

const LiveMatch = () => {
  const [data, setData] = useState<LiveMatchResponse | null>(null);
  const [outcomes, setOutcomes] = useState<Outcomes | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[] | null>(null);
  const [error, setError] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<number | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const clientRef = useRef<RestApiClient>();
  if (!clientRef.current) {
    clientRef.current = new RestApiClient();
  }

  const loadLive = useCallback(() => {
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

  const loadOdds = useCallback(
    (home: string, away: string, homeScore: number | null, awayScore: number | null) => {
      const params = [`home=${encodeURIComponent(home)}`, `away=${encodeURIComponent(away)}`];
      if (homeScore !== null) {
        params.push(`homeScore=${homeScore}`);
      }
      if (awayScore !== null) {
        params.push(`awayScore=${awayScore}`);
      }
      clientRef
        .current!.get<MatchOddsResponse>(`/s/match-odds?${params.join('&')}`)
        .then((response) => {
          setOutcomes(response.found ? response.outcomes ?? null : null);
          setLeaderboard(response.found ? response.provisionalLeaderboard ?? null : null);
        })
        .catch(() => {
          setOutcomes(null);
          setLeaderboard(null);
        });
    },
    [],
  );

  const isRunning = data?.state === 'LIVE' || data?.state === 'HALF_TIME';
  const matchKey =
    data?.found && data.home && data.away
      ? `${data.home}|${data.away}|${data.homeScore ?? ''}|${data.awayScore ?? ''}`
      : null;

  useEffect(() => {
    loadLive();
  }, [loadLive]);

  useEffect(() => {
    const intervalMs = isRunning ? LIVE_POLL_INTERVAL_MS : IDLE_POLL_INTERVAL_MS;
    const interval = setInterval(loadLive, intervalMs);
    return () => clearInterval(interval);
  }, [isRunning, loadLive]);

  useEffect(() => {
    if (data?.found && data.home && data.away) {
      loadOdds(data.home, data.away, data.homeScore ?? null, data.awayScore ?? null);
    } else {
      setOutcomes(null);
      setLeaderboard(null);
    }
  }, [matchKey, loadOdds]);

  useEffect(() => {
    const ticker = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  const refresh = useCallback(() => {
    loadLive();
    if (data?.found && data.home && data.away) {
      loadOdds(data.home, data.away, data.homeScore ?? null, data.awayScore ?? null);
    }
  }, [loadLive, loadOdds, data]);

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
      outcomes={outcomes}
      leaderboard={leaderboard}
      footer={
        <RefreshFooter
          lastRefreshedAt={lastRefreshedAt}
          now={now}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
          stale={error}
          dataSource={data.dataSource}
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
