export type MatchInfo = {
  home: string;
  away: string;
  score: string;
};

export type WinningBet = {
  firstName: string;
  puntos: number;
};

export type EvolutionRow = {
  personId: string;
  firstName: string;
  points: number;
  matchEndDate: string | null;
};

export type MatchResumeInput = {
  match: MatchInfo;
  matchEndDate: string | null;
  winners: WinningBet[];
  evolutions: EvolutionRow[];
};

type RankedPerson = {
  personId: string;
  firstName: string;
  total: number;
  rank: number;
};

const timeOf = (date: string | null): number =>
  date ? new Date(date).getTime() : 0;

const rankAsOf = (
  evolutions: EvolutionRow[],
  cutoff: number,
  inclusive: boolean,
): Map<string, RankedPerson> => {
  const totals = new Map<string, { firstName: string; total: number }>();

  for (const row of evolutions) {
    const entry = totals.get(row.personId) ?? { firstName: row.firstName, total: 0 };
    const time = timeOf(row.matchEndDate);
    const include = inclusive ? time <= cutoff : time < cutoff;
    if (include) {
      entry.total += row.points;
    }
    totals.set(row.personId, entry);
  }

  const sorted = [...totals.entries()]
    .map(([personId, value]) => ({
      personId,
      firstName: value.firstName,
      total: value.total,
    }))
    .sort((a, b) => b.total - a.total || a.firstName.localeCompare(b.firstName));

  const ranked = new Map<string, RankedPerson>();
  sorted.forEach((entry, index) => {
    ranked.set(entry.personId, { ...entry, rank: index + 1 });
  });

  return ranked;
};

const formatIndicator = (delta: number): string =>
  delta > 0 ? `+${delta}` : delta < 0 ? `${delta}` : '=';

export const buildMatchResumeMessage = (input: MatchResumeInput): string => {
  const cutoff = timeOf(input.matchEndDate);
  const current = rankAsOf(input.evolutions, cutoff, true);
  const previous = rankAsOf(input.evolutions, cutoff, false);

  const header = `⚽ Terminé — ${input.match.home} ${input.match.score} ${input.match.away}`;

  const winnersLine =
    input.winners.length === 0
      ? '🏆 Aucun gagnant'
      : `🏆 Gagnants (+${Math.max(
          ...input.winners.map((winner) => winner.puntos),
        )} puntos chacun) :\n ${input.winners
          .map((winner) => winner.firstName)
          .sort((a, b) => a.localeCompare(b))
          .join(', ')}`;

  const rows = [...current.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((person) => {
      const previousRank = previous.get(person.personId)?.rank ?? person.rank;
      return {
        rank: person.rank,
        firstName: person.firstName,
        total: person.total,
        indicator: formatIndicator(previousRank - person.rank),
      };
    });

  const nameWidth = Math.max(...rows.map((row) => row.firstName.length));
  const pointsWidth = Math.max(...rows.map((row) => `${row.total}`.length));

  const board = rows.map((row) => {
    const name = row.firstName.padEnd(nameWidth);
    const total = `${row.total}`.padStart(pointsWidth);
    return `${row.rank}. ${name} — ${total}  (*${row.indicator}*)`;
  });

  return [header, winnersLine, '', '📊 Classement', ...board].join('\n');
};
