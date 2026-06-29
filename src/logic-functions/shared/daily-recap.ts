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
  longestWinStreak: { name: string; length: number } | null;
  longestLossStreak: { name: string; length: number } | null;
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

const firstNameOf = (
  person: { name: { firstName: string | null } | null } | null,
): string | null => person?.name?.firstName ?? null;

const longestRun = (
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
    let longest = 0;
    for (const bet of ordered) {
      if (bet.won === wanted) {
        run += 1;
        longest = Math.max(longest, run);
      } else {
        run = 0;
      }
    }
    if (longest >= 2 && (!best || longest > best.length)) {
      best = { name, length: longest };
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
    .map((match) => ({ match, cote: winningCote(match) }))
    .filter(
      (entry): entry is { match: RecapMatchRecord; cote: number } =>
        entry.cote !== null && entry.cote >= OUTSIDER_MIN_COTE,
    )
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
  const afterRanks = computeRanks(totalsAsOf(dayEnd));

  const rankingMoves = [...afterRanks.entries()]
    .map(([personId, to]) => {
      const from = beforeRanks.get(personId) ?? to;
      return { name: nameById.get(personId) ?? '?', from, to, delta: from - to };
    })
    .filter((move) => move.delta !== 0)
    .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta) || a.name.localeCompare(b.name));

  const yesterdayBets = bets.filter((bet) => {
    const end = timeOf(bet.match?.endDate ?? null);
    return end >= dayStart && end < dayEnd;
  });

  const wonByPerson = new Map<string, { name: string; puntos: number }>();
  const lostByPerson = new Map<string, { name: string; lost: number }>();
  for (const bet of yesterdayBets) {
    const name = firstNameOf(bet.person);
    const personId = bet.person?.id;
    if (!name || !personId) {
      continue;
    }
    if (bet.won === true) {
      const entry = wonByPerson.get(personId) ?? { name, puntos: 0 };
      entry.puntos += bet.puntos ?? 0;
      wonByPerson.set(personId, entry);
    }
    if (bet.won === false) {
      const entry = lostByPerson.get(personId) ?? { name, lost: 0 };
      entry.lost += 1;
      lostByPerson.set(personId, entry);
    }
  }

  const topBettorOfDay =
    [...wonByPerson.values()]
      .filter((entry) => entry.puntos > 0)
      .sort((a, b) => b.puntos - a.puntos || a.name.localeCompare(b.name))[0] ?? null;

  const flopBettorOfDay =
    [...lostByPerson.values()]
      .sort((a, b) => b.lost - a.lost || a.name.localeCompare(b.name))[0] ?? null;

  return {
    date: new Date(dayStart).toISOString(),
    matches: formattedMatches,
    outsiderWins,
    rankingMoves,
    topBettorOfDay,
    flopBettorOfDay,
    longestWinStreak: longestRun(bets, true, dayEnd),
    longestLossStreak: longestRun(bets, false, dayEnd),
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
  if (facts.longestWinStreak) {
    funFactParts.push(
      `Record de la saison : ${facts.longestWinStreak.name} et sa série de ${facts.longestWinStreak.length} paris gagnés d'affilée. 🔥`,
    );
  }
  if (facts.longestLossStreak) {
    funFactParts.push(
      `À l'opposé, ${facts.longestLossStreak.name} détient les ${facts.longestLossStreak.length} défaites de rang. 💀`,
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
