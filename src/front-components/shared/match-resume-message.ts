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

  const header = `⚽ Terminé — ${input.match.home} ${input.match.score} ${input.match.away}\n`;

  const winnersLine =
    input.winners.length === 0
      ? '🏆 Aucun gagnant'
      : `🏆 Gagnants (+${Math.max(
          ...input.winners.map((winner) => winner.puntos),
        )} puntos chacun) : ${input.winners
          .map((winner) => winner.firstName)
          .sort((a, b) => a.localeCompare(b))
          .join(', ')}`;

  const board = [...current.values()]
    .sort((a, b) => a.rank - b.rank)
    .map((person) => {
      const previousRank = previous.get(person.personId)?.rank ?? person.rank;
      const delta = previousRank - person.rank;
      return `${person.rank}. ${person.firstName} — ${person.total}  (${formatIndicator(delta)})`;
    });

  return [header, winnersLine, '', '📊 Classement', ...board].join('\n');
};
