import { defineFrontComponent } from 'twenty-sdk/define';
import { RestApiClient } from 'twenty-client-sdk/rest';
import { Fragment, useCallback, useEffect, useRef, useState } from 'react';

export const FINISHED_MATCHES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '43884eda-a16f-42f6-a5ec-d7185211ba62';

type Winner = {
  name: string;
  totalPuntos: number;
};

type FinishedMatch = {
  home: string;
  away: string;
  score: string;
  endDate: string | null;
  puntos: number;
  winners: Winner[];
};

type FinishedMatchesResponse = { matches: FinishedMatch[] };

const dayFormatter = new Intl.DateTimeFormat('en-GB', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
});

const dayKeyOf = (endDate: string | null): string =>
  endDate ? new Date(endDate).toDateString() : 'unknown';

const dayLabelOf = (endDate: string | null): string =>
  endDate ? dayFormatter.format(new Date(endDate)) : 'Unknown date';

const KEYFRAMES = `
@keyframes fm-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes fm-rise { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fm-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.12); } 100% { transform: scale(1); opacity: 1; } }
`;

const FONT =
  'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

const WinnerChip = ({ winner, index }: { winner: Winner; index: number }) => {
  const [hovered, setHovered] = useState(false);

  return (
    <span
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: 'relative',
        display: 'inline-block',
        padding: '2px 8px',
        borderRadius: '999px',
        background: 'linear-gradient(180deg, #fff6da 0%, #ffe9a8 100%)',
        border: '1px solid #f5d77a',
        fontSize: '11px',
        fontWeight: 700,
        color: '#7c5a12',
        cursor: 'default',
        animation: `fm-pop 0.35s ${0.05 * index}s both`,
      }}
    >
      {winner.name}
      {hovered ? (
        <span
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 6px)',
            left: '50%',
            transform: 'translateX(-50%)',
            padding: '4px 8px',
            borderRadius: '6px',
            background: '#2d2748',
            color: '#ffffff',
            fontSize: '10px',
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.22)',
            zIndex: 10,
            pointerEvents: 'none',
          }}
        >
          🏅 {winner.totalPuntos} puntos
        </span>
      ) : null}
    </span>
  );
};

const Winners = ({ match }: { match: FinishedMatch }) => {
  if (match.winners.length === 0) {
    return (
      <div style={{ fontSize: '11px', fontStyle: 'italic', color: '#9ca3af' }}>
        💩 nobody nailed it
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignContent: 'flex-start' }}>
      {match.winners.map((winner, index) => (
        <WinnerChip key={winner.name} winner={winner} index={index} />
      ))}
    </div>
  );
};

const MatchCard = ({ match, index }: { match: FinishedMatch; index: number }) => (
  <div
    style={{
      display: 'flex',
      alignItems: 'stretch',
      gap: '10px',
      padding: '9px 11px',
      borderRadius: '12px',
      background: '#ffffff',
      border: '1px solid #eceaf3',
      boxShadow: '0 2px 6px rgba(80, 60, 140, 0.06)',
      animation: `fm-rise 0.4s ${Math.min(index, 8) * 0.05}s both`,
    }}
  >
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        flex: '0 0 auto',
        minWidth: 0,
        width: '150px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
          minWidth: 0,
          fontSize: '12px',
          fontWeight: 700,
          color: '#1a1a1a',
        }}
      >
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {match.home}
        </span>
        <span style={{ fontSize: '11px' }}>⚽</span>
        <span
          style={{
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {match.away}
        </span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span
          style={{
            padding: '2px 9px',
            borderRadius: '7px',
            background: '#f4f2fb',
            fontSize: '15px',
            fontWeight: 800,
            letterSpacing: '0.5px',
            color: '#3a2f63',
          }}
        >
          {match.score || '–'}
        </span>
        {match.winners.length > 0 ? (
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '3px',
              fontSize: '12px',
              fontWeight: 800,
              color: '#b45309',
              whiteSpace: 'nowrap',
            }}
          >
            🏆 {match.puntos} puntos
          </span>
        ) : null}
      </div>
    </div>

    <div
      style={{
        flex: '1 1 0',
        minWidth: 0,
        display: 'flex',
        alignItems: 'center',
        paddingLeft: '10px',
        borderLeft: '1px solid #f0eef6',
      }}
    >
      <Winners match={match} />
    </div>
  </div>
);

const DateDivider = ({ label }: { label: string }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '2px 2px 0' }}>
    <span
      style={{
        fontSize: '10px',
        fontWeight: 800,
        letterSpacing: '0.5px',
        textTransform: 'uppercase',
        color: '#a59fc0',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </span>
    <span style={{ flex: 1, height: '1px', background: '#e4e1ef' }} />
  </div>
);

const Shell = ({ children }: { children: React.ReactNode }) => (
  <div
    style={{
      height: '100%',
      width: '100%',
      boxSizing: 'border-box',
      overflowY: 'auto',
      padding: '12px',
      background: 'linear-gradient(180deg, #fbfbff 0%, #f1f0fa 100%)',
      fontFamily: FONT,
    }}
  >
    <style>{KEYFRAMES}</style>
    {children}
  </div>
);

const RefreshButton = ({
  onRefresh,
  isRefreshing,
}: {
  onRefresh: () => void;
  isRefreshing: boolean;
}) => (
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
      color: '#9ca3af',
      cursor: isRefreshing ? 'default' : 'pointer',
      fontSize: '14px',
      lineHeight: 1,
    }}
  >
    <span
      style={{
        display: 'inline-block',
        animation: isRefreshing ? 'fm-spin 0.8s linear infinite' : 'none',
      }}
    >
      ↻
    </span>
  </button>
);

const FinishedMatches = () => {
  const [matches, setMatches] = useState<FinishedMatch[] | null>(null);
  const [error, setError] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const clientRef = useRef<RestApiClient>();
  if (!clientRef.current) {
    clientRef.current = new RestApiClient();
  }

  const load = useCallback(() => {
    setIsRefreshing(true);
    clientRef
      .current!.get<FinishedMatchesResponse>('/s/finished-matches')
      .then((response) => {
        setMatches(response.matches);
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
        <span style={{ fontSize: '14px', fontWeight: 800, color: '#3a2f63' }}>
          🏁 Hall of Winners
        </span>
        <RefreshButton onRefresh={load} isRefreshing={isRefreshing} />
      </div>

      {error && !matches ? (
        <div style={{ fontSize: '13px', color: '#9ca3af' }}>Results unavailable</div>
      ) : !matches ? (
        <div style={{ fontSize: '13px', color: '#9ca3af' }}>…</div>
      ) : matches.length === 0 ? (
        <div style={{ fontSize: '13px', color: '#9ca3af' }}>
          No finished match yet ⏳
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {matches.map((match, index) => {
            const showDay = index === 0 || dayKeyOf(match.endDate) !== dayKeyOf(matches[index - 1].endDate);
            return (
              <Fragment key={`${match.home}-${match.away}-${index}`}>
                {showDay ? <DateDivider label={dayLabelOf(match.endDate)} /> : null}
                <MatchCard match={match} index={index} />
              </Fragment>
            );
          })}
        </div>
      )}
    </Shell>
  );
};

export default defineFrontComponent({
  universalIdentifier: FINISHED_MATCHES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'Finished Matches',
  description:
    'Scrollable list of finished matches (newest first) with final score, puntos won, and the winning bettors.',
  component: FinishedMatches,
});
