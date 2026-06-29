import { computeRanks, RankTotals } from 'src/logic-functions/shared/leaderboard';

export type RecapMatchRecord = {
  id: string;
  home: string | null;
  away: string | null;
  score: string | null;
  result: string | null;
  endDate: string | null;
  prematchHomeCote: number | null;
  prematchDrawCote: number | null;
  prematchAwayCote: number | null;
};

export type RecapBetRecord = {
  won: boolean | null;
  puntos: number | null;
  person: { id: string | null; name: { firstName: string | null } | null } | null;
  match: { id: string | null; endDate: string | null; result: string | null } | null;
};

export type RecapPersonRecord = {
  id: string;
  name: { firstName: string | null } | null;
};

export type RecapFacts = {
  date: string;
  matches: Array<{ label: string; score: string; winner: string }>;
  outsiderWins: Array<{ label: string; score: string; winner: string; cote: number }>;
  rankingMoves: Array<{ name: string; from: number; to: number; delta: number }>;
  topBettorOfDay: { name: string; puntos: number } | null;
  flopBettorOfDay: { name: string; lost: number } | null;
  currentWinStreak: { name: string; length: number } | null;
  currentLossStreak: { name: string; length: number } | null;
  standings: Array<{ name: string; rank: number; total: number; delta: number }>;
  dayBoard: Array<{ name: string; won: number; lost: number; puntos: number }>;
};

export type RecapCopy = {
  headline: string;
  rankingMoves: string;
  notableResults: string;
  funFact: string;
  mood: string;
};

const HOME_WIN = 'HOME_WIN';
const AWAY_WIN = 'AWAY_WIN';
const NULL_OR_DRAW = 'NULL_OR_DRAW';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const timeOf = (date: string | null): number => (date ? new Date(date).getTime() : 0);

export const utcDayStart = (ms: number): number => {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
};

const winnerLabel = (match: RecapMatchRecord): string => {
  if (match.result === HOME_WIN) return match.home ?? 'Domicile';
  if (match.result === AWAY_WIN) return match.away ?? 'Extérieur';
  return 'Match nul';
};

const winningCote = (match: RecapMatchRecord): number | null => {
  if (match.result === HOME_WIN) return match.prematchHomeCote;
  if (match.result === AWAY_WIN) return match.prematchAwayCote;
  if (match.result === NULL_OR_DRAW) return match.prematchDrawCote;
  return null;
};

const OUTSIDER_MIN_COTE = 2.2;
const MIN_STREAK = 2;

// An outsider win is a team (not a draw) that was the least-favoured outcome:
// its prematch cote is the highest of the three and clears the floor.
const isOutsiderWin = (match: RecapMatchRecord): boolean => {
  if (match.result !== HOME_WIN && match.result !== AWAY_WIN) {
    return false;
  }
  const cote = winningCote(match);
  if (cote === null || cote < OUTSIDER_MIN_COTE) {
    return false;
  }
  const others = [match.prematchHomeCote, match.prematchDrawCote, match.prematchAwayCote];
  return others.every((other) => other === null || other <= cote);
};

const firstNameOf = (
  person: { name: { firstName: string | null } | null } | null,
): string | null => person?.name?.firstName ?? null;

// The current ongoing run of `wanted` results as of `cutoff`: the trailing
// streak ending at each person's most recent settled bet. Returns the person on
// the longest such run (a heater of wins, or a cold spell of losses).
const currentStreak = (
  bets: RecapBetRecord[],
  wanted: boolean,
  cutoff: number,
): { name: string; length: number } | null => {
  const byPerson = new Map<string, { name: string; bets: RecapBetRecord[] }>();

  for (const bet of bets) {
    const personId = bet.person?.id;
    const name = firstNameOf(bet.person);
    if (
      !personId ||
      !name ||
      bet.won === null ||
      !bet.match?.endDate ||
      timeOf(bet.match.endDate) >= cutoff
    ) {
      continue;
    }
    const entry = byPerson.get(personId) ?? { name, bets: [] };
    entry.bets.push(bet);
    byPerson.set(personId, entry);
  }

  let best: { name: string; length: number } | null = null;

  for (const { name, bets: personBets } of byPerson.values()) {
    const ordered = [...personBets].sort(
      (a, b) => timeOf(a.match!.endDate) - timeOf(b.match!.endDate),
    );
    let run = 0;
    for (let index = ordered.length - 1; index >= 0; index -= 1) {
      if (ordered[index].won === wanted) {
        run += 1;
      } else {
        break;
      }
    }
    if (run >= MIN_STREAK && (!best || run > best.length)) {
      best = { name, length: run };
    }
  }

  return best;
};

export const buildRecapFacts = (
  matches: RecapMatchRecord[],
  bets: RecapBetRecord[],
  people: RecapPersonRecord[],
  dayStart: number,
): RecapFacts => {
  const dayEnd = dayStart + MS_PER_DAY;

  const yesterdayMatches = matches.filter((match) => {
    const end = timeOf(match.endDate);
    return Boolean(match.result) && end >= dayStart && end < dayEnd;
  });

  const formattedMatches = yesterdayMatches.map((match) => ({
    label: `${match.home ?? '?'} - ${match.away ?? '?'}`,
    score: match.score ?? '',
    winner: winnerLabel(match),
  }));

  const outsiderWins = yesterdayMatches
    .filter(isOutsiderWin)
    .map((match) => ({ match, cote: winningCote(match) as number }))
    .sort((a, b) => b.cote - a.cote)
    .map(({ match, cote }) => ({
      label: `${match.home ?? '?'} - ${match.away ?? '?'}`,
      score: match.score ?? '',
      winner: winnerLabel(match),
      cote: Math.round(cote * 100) / 100,
    }));

  const nameById = new Map<string, string>();
  for (const person of people) {
    const name = person.name?.firstName;
    if (person.id && name) {
      nameById.set(person.id, name);
    }
  }

  const totalsAsOf = (cutoff: number): RankTotals => {
    const totals: RankTotals = new Map();
    for (const [id, firstName] of nameById) {
      totals.set(id, { firstName, total: 0 });
    }
    for (const bet of bets) {
      const personId = bet.person?.id;
      if (
        !personId ||
        bet.puntos === null ||
        !bet.match?.result ||
        timeOf(bet.match.endDate) >= cutoff
      ) {
        continue;
      }
      const entry = totals.get(personId);
      const firstName = firstNameOf(bet.person);
      if (entry) {
        entry.total += bet.puntos;
      } else if (firstName) {
        totals.set(personId, { firstName, total: bet.puntos });
      }
    }
    return totals;
  };

  const beforeRanks = computeRanks(totalsAsOf(dayStart));
  const afterTotals = totalsAsOf(dayEnd);
  const afterRanks = computeRanks(afterTotals);

  const standings = [...afterRanks.entries()]
    .map(([personId, rank]) => ({
      name: nameById.get(personId) ?? '?',
      rank,
      total: afterTotals.get(personId)?.total ?? 0,
      delta: (beforeRanks.get(personId) ?? rank) - rank,
    }))
    .sort((a, b) => a.rank - b.rank);

  const rankingMoves = standings
    .filter((entry) => entry.delta !== 0)
    .map(({ name, rank, delta }) => ({ name, from: rank + delta, to: rank, delta }))
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name));

  const yesterdayBets = bets.filter((bet) => {
    const end = timeOf(bet.match?.endDate ?? null);
    return end >= dayStart && end < dayEnd;
  });

  const dayByPerson = new Map<
    string,
    { name: string; won: number; lost: number; puntos: number }
  >();
  for (const bet of yesterdayBets) {
    const name = firstNameOf(bet.person);
    const personId = bet.person?.id;
    if (!name || !personId || bet.won === null) {
      continue;
    }
    const entry = dayByPerson.get(personId) ?? { name, won: 0, lost: 0, puntos: 0 };
    if (bet.won === true) {
      entry.won += 1;
      entry.puntos += bet.puntos ?? 0;
    } else {
      entry.lost += 1;
    }
    dayByPerson.set(personId, entry);
  }

  const dayBoard = [...dayByPerson.values()].sort(
    (a, b) => b.puntos - a.puntos || a.name.localeCompare(b.name),
  );

  const topBettorOfDay =
    dayBoard
      .filter((entry) => entry.puntos > 0)
      .map((entry) => ({ name: entry.name, puntos: entry.puntos }))[0] ?? null;

  const flopBettorOfDay =
    [...dayBoard]
      .filter((entry) => entry.lost > 0)
      .sort((a, b) => b.lost - a.lost || a.name.localeCompare(b.name))
      .map((entry) => ({ name: entry.name, lost: entry.lost }))[0] ?? null;

  return {
    date: new Date(dayStart).toISOString(),
    matches: formattedMatches,
    outsiderWins,
    rankingMoves,
    topBettorOfDay,
    flopBettorOfDay,
    currentWinStreak: currentStreak(bets, true, dayEnd),
    currentLossStreak: currentStreak(bets, false, dayEnd),
    standings,
    dayBoard,
  };
};

export const buildFallbackCopy = (facts: RecapFacts): RecapCopy => {
  const climber = facts.rankingMoves.find((move) => move.delta > 0);
  const faller = facts.rankingMoves.find((move) => move.delta < 0);

  const rankingMoves =
    facts.rankingMoves.length === 0
      ? 'Classement figé : tout le monde campe sur ses positions. 😴'
      : [
          climber
            ? `${climber.name} grimpe de ${climber.delta} place(s) jusqu'au #${climber.to}.`
            : null,
          faller
            ? `${faller.name} dévisse à la #${faller.to} (${faller.delta}).`
            : null,
        ]
          .filter(Boolean)
          .join(' ');

  const notableResults =
    facts.outsiderWins.length > 0
      ? facts.outsiderWins
          .map(
            (win) =>
              `${win.label} (${win.score}) : ${win.winner} crée la surprise, cote à ${win.cote} ! 🤯`,
          )
          .join(' ')
      : facts.matches.length > 0
        ? `${facts.matches.length} match(s) joué(s), rien de bien fou côté surprises.`
        : 'Pas un seul match hier, repos pour tout le monde. 🛋️';

  const funFactParts: string[] = [];
  if (facts.topBettorOfDay) {
    funFactParts.push(
      `${facts.topBettorOfDay.name} rafle ${facts.topBettorOfDay.puntos} puntos sur la journée. 🤑`,
    );
  }
  if (facts.currentWinStreak) {
    funFactParts.push(
      `${facts.currentWinStreak.name} est en feu avec ${facts.currentWinStreak.length} paris gagnés d'affilée. 🔥`,
    );
  }
  if (facts.currentLossStreak) {
    funFactParts.push(
      `À l'opposé, ${facts.currentLossStreak.name} enchaîne ${facts.currentLossStreak.length} défaites de suite. 💀`,
    );
  }

  return {
    headline:
      facts.matches.length > 0
        ? `${facts.matches.length} match(s) hier, et ça a bougé ! ⚽`
        : 'Journée blanche au programme 😴',
    rankingMoves,
    notableResults,
    funFact:
      funFactParts.length > 0
        ? funFactParts.join(' ')
        : 'Aucune stat croustillante aujourd\'hui, les parieurs se tiennent à carreau.',
    mood: facts.outsiderWins.length > 0 ? '🤯' : facts.matches.length > 0 ? '⚽' : '😴',
  };
};
