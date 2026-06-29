import { computeRanks, RankTotals } from 'src/logic-functions/shared/leaderboard';
import { computeWinnerBetPot } from 'src/logic-functions/shared/winner-bet-puntos-ev';

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
  puntevs?: number | null;
  person: { id: string | null; name: { firstName: string | null } | null } | null;
  match: { id: string | null; endDate: string | null; result: string | null } | null;
};

export type RecapPersonRecord = {
  id: string;
  name: { firstName: string | null } | null;
  wcWinnerBet?: string | null;
  victoryChance?: number | null;
  winnerBetPuntosEv?: number | null;
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
  dayBoard: Array<{
    name: string;
    won: number;
    lost: number;
    puntos: number;
    expected: number;
    luck: number;
  }>;
  // Season-long puntEV ranking: how many puntos each bettor was "supposed" to
  // have banked by now given the odds and how many rivals shared each bet,
  // versus what they actually have. luck = actual - expected (positif = veinard,
  // négatif = poissard), luckRankDelta = puntEV rank - real rank (positif = il
  // surclasse son rang d'espérance).
  puntEvStandings: Array<{
    name: string;
    realRank: number;
    evRank: number;
    expected: number;
    actual: number;
    luck: number;
    luckRankDelta: number;
  }>;
  // Current World Cup winner bets: who put their final-trophy hope on which team,
  // the bookmaker-implied chance it lifts the cup, and the puntos jackpot each
  // backer would pocket if it does (shared between everyone who picked it).
  winnerBets: Array<{
    team: string;
    victoryChance: number | null;
    puntosIfVictory: number | null;
    backers: string[];
  }>;
};

export type RecapCopy = {
  // The whole chronicle of the day as a single free-form markdown string
  // (title, paragraphs, bullet points, emojis and stats).
  article: string;
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

// Lowered so more results clear the "fait marquant" bar: a modest favourite
// that was still the underdog of its match now counts as notable.
const OUTSIDER_MIN_COTE = 1.8;
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
    { name: string; won: number; lost: number; puntos: number; expected: number }
  >();
  for (const bet of yesterdayBets) {
    const name = firstNameOf(bet.person);
    const personId = bet.person?.id;
    if (!name || !personId || bet.won === null) {
      continue;
    }
    const entry =
      dayByPerson.get(personId) ?? { name, won: 0, lost: 0, puntos: 0, expected: 0 };
    entry.expected += bet.puntevs ?? 0;
    if (bet.won === true) {
      entry.won += 1;
      entry.puntos += bet.puntos ?? 0;
    } else {
      entry.lost += 1;
    }
    dayByPerson.set(personId, entry);
  }

  const dayBoard = [...dayByPerson.values()]
    .map((entry) => ({
      ...entry,
      expected: Math.round(entry.expected),
      luck: Math.round(entry.puntos - entry.expected),
    }))
    .sort((a, b) => b.puntos - a.puntos || a.name.localeCompare(b.name));

  const topBettorOfDay =
    dayBoard
      .filter((entry) => entry.puntos > 0)
      .map((entry) => ({ name: entry.name, puntos: entry.puntos }))[0] ?? null;

  const flopBettorOfDay =
    [...dayBoard]
      .filter((entry) => entry.lost > 0)
      .sort((a, b) => b.lost - a.lost || a.name.localeCompare(b.name))
      .map((entry) => ({ name: entry.name, lost: entry.lost }))[0] ?? null;

  // Expected puntos banked by the end of the day, from each settled bet's puntEV
  // (win probability * pot / co-bettors). Comparing this to the real total
  // surfaces who is riding their luck and who is being robbed by the football
  // gods.
  const expectedTotals = new Map<string, number>();
  for (const bet of bets) {
    const personId = bet.person?.id;
    if (
      !personId ||
      bet.puntevs === null ||
      bet.puntevs === undefined ||
      !bet.match?.result ||
      timeOf(bet.match.endDate) >= dayEnd
    ) {
      continue;
    }
    expectedTotals.set(personId, (expectedTotals.get(personId) ?? 0) + bet.puntevs);
  }

  const evRankById = computeRanks(
    new Map(
      [...nameById].map(([id, firstName]) => [
        id,
        { firstName, total: expectedTotals.get(id) ?? 0 },
      ]),
    ),
  );

  const puntEvStandings = [...nameById]
    .map(([id, name]) => {
      const realRank = afterRanks.get(id) ?? 0;
      const evRank = evRankById.get(id) ?? 0;
      const expected = Math.round(expectedTotals.get(id) ?? 0);
      const actual = Math.round(afterTotals.get(id)?.total ?? 0);
      return {
        name,
        realRank,
        evRank,
        expected,
        actual,
        luck: actual - expected,
        luckRankDelta: evRank - realRank,
      };
    })
    .filter((entry) => entry.realRank > 0 && entry.evRank > 0)
    .sort((a, b) => a.evRank - b.evRank);

  const winnerBackersByTeam = new Map<string, number>();
  for (const person of people) {
    const team = person.wcWinnerBet?.trim();
    if (team) {
      const key = team.toLowerCase();
      winnerBackersByTeam.set(key, (winnerBackersByTeam.get(key) ?? 0) + 1);
    }
  }

  const winnerGroups = new Map<
    string,
    { team: string; victoryChance: number | null; backers: string[] }
  >();
  for (const person of people) {
    const team = person.wcWinnerBet?.trim();
    const name = person.name?.firstName;
    if (!team || !name) {
      continue;
    }
    const group = winnerGroups.get(team) ?? {
      team,
      victoryChance: person.victoryChance ?? null,
      backers: [],
    };
    group.backers.push(name);
    winnerGroups.set(team, group);
  }

  const winnerBets = [...winnerGroups.values()]
    .map((group) => {
      const pot = computeWinnerBetPot({
        predictorsForTeam: winnerBackersByTeam.get(group.team.toLowerCase()) ?? 0,
      });
      return {
        team: group.team,
        victoryChance: group.victoryChance,
        puntosIfVictory: pot === null ? null : Math.round(pot),
        backers: group.backers.sort((a, b) => a.localeCompare(b)),
      };
    })
    .sort((a, b) => (b.victoryChance ?? 0) - (a.victoryChance ?? 0));

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
    puntEvStandings,
    winnerBets,
  };
};

// A small deterministic PRNG seeded from a string, so the fallback article
// varies from one day to the next but stays stable when a day is regenerated.
const createRng = (seed: string): (() => number) => {
  let h = 2166136261;
  for (let index = 0; index < seed.length; index += 1) {
    h ^= seed.charCodeAt(index);
    h = Math.imul(h, 16777619);
  }
  let state = h >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const pick = <T,>(rng: () => number, options: T[]): T =>
  options[Math.floor(rng() * options.length) % options.length];

const shuffle = <T,>(rng: () => number, items: T[]): T[] => {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

const WIN_VERBS = [
  "dispose de",
  "fait plier",
  "vient à bout de",
  "s'impose face à",
  "corrige",
  "écarte",
  "renvoie à la maison",
];
const DRAW_CLAUSES = [
  (home: string, away: string, score: string) =>
    `${home} et ${away} se neutralisent (${score})`,
  (home: string, away: string, score: string) =>
    `${home} et ${away} se quittent dos à dos (${score})`,
  (home: string, away: string, score: string) =>
    `partage des points entre ${home} et ${away} (${score})`,
  (home: string, away: string, score: string) =>
    `${home} et ${away} font chou blanc (${score})`,
];
const OUTSIDER_FLAVORS = [
  (cote: number) => `, énorme surprise cotée à ${cote} ! 🤯`,
  (cote: number) => ` et fait sauter la banque, cote à ${cote} 🤯`,
  (cote: number) => `, personne n'avait vu venir ce ${cote} de cote 😱`,
  (cote: number) => ` contre toute attente (cote ${cote}) 💸`,
];
const CLIMB_VERBS = ['grimpe', 'bondit', 'remonte', 'progresse', 'grappille'];
const FALL_VERBS = ['dévisse', 'plonge', 'dégringole', 'glisse', 'recule'];
const QUIET_LINES = [
  'Pas un ballon n\'a roulé hier : repos forcé pour les flambeurs, qui ont dû se rabattre sur la belote. 🛋️',
  'Journée blanche, aucun match au menu. Les parieurs ont rongé leur frein en attendant la reprise. 😴',
  'Calme plat sur les pelouses hier — pas de match, pas de drame, juste le silence des claviers. 🤫',
];
const KICKERS = [
  'Rendez-vous demain pour la suite des hostilités. 🍿',
  'On remet ça demain, affûtez vos pronos ! ✍️',
  'La nuit porte conseil… surtout pour les poissards. 😴',
  'À demain pour un nouveau chapitre de cette saga. 📖',
];

// A free-form markdown chronicle assembled from the raw facts, used when the
// writer agent is unavailable. It deliberately varies its title, structure and
// wording each day (seeded on the date) so the feed never reads like the same
// template twice, and leans on flowing prose rather than a rigid bullet grid.
export const buildFallbackCopy = (facts: RecapFacts): RecapCopy => {
  const rng = createRng(facts.date);
  const climber = facts.rankingMoves.find((move) => move.delta > 0) ?? null;
  const faller = facts.rankingMoves.find((move) => move.delta < 0) ?? null;
  const luckiest = [...facts.puntEvStandings].sort((a, b) => b.luck - a.luck)[0] ?? null;
  const unluckiest = [...facts.puntEvStandings].sort((a, b) => a.luck - b.luck)[0] ?? null;
  const top = facts.topBettorOfDay;
  const bestOutsider = facts.outsiderWins[0] ?? null;
  const favouriteBet = facts.winnerBets.find((bet) => bet.backers.length > 0) ?? null;

  // --- Title: pick among the angles actually backed by data. ---
  const titleCandidates: string[] = [];
  if (bestOutsider) {
    titleCandidates.push(
      `## 🤯 ${bestOutsider.winner} fait trembler la planche à billets (cote ${bestOutsider.cote}) !`,
    );
  }
  if (top) {
    titleCandidates.push(`## 🤑 ${top.name} braque la caisse (${top.puntos} puntos) !`);
  }
  if (climber) {
    titleCandidates.push(`## 🚀 ${climber.name} joue les alpinistes au classement`);
  }
  if (faller) {
    titleCandidates.push(`## 📉 Coup de mou pour ${faller.name}`);
  }
  if (luckiest && luckiest.luck > 0) {
    titleCandidates.push(`## 🍀 ${luckiest.name}, ce veinard insolent`);
  }
  if (facts.matches.length > 0) {
    titleCandidates.push(
      `## ⚽ ${facts.matches.length} match${facts.matches.length > 1 ? 's' : ''} au compteur, ça a chauffé`,
      `## 📰 La Bleusaille a vibré hier soir`,
    );
  }
  if (titleCandidates.length === 0) {
    titleCandidates.push('## 😴 Journée blanche à la Bleusaille');
  }
  const title = pick(rng, titleCandidates);

  // --- Quiet day: short, varied, no template. ---
  if (facts.matches.length === 0) {
    return { article: [title, '', pick(rng, QUIET_LINES)].join('\n') };
  }

  const sections: string[] = [];

  // --- Results: alternate between a flowing paragraph and a bullet list. ---
  const coteByLabel = new Map(facts.outsiderWins.map((win) => [win.label, win.cote]));
  const matchClause = (m: { label: string; score: string; winner: string }): string => {
    const [home, away] = m.label.split(' - ');
    const cote = coteByLabel.get(m.label);
    if (m.winner === 'Match nul') {
      return pick(rng, DRAW_CLAUSES)(home ?? '?', away ?? '?', m.score);
    }
    const opponent = m.winner === home ? away : home;
    const base = `${m.winner} ${pick(rng, WIN_VERBS)} ${opponent ?? '?'} (${m.score})`;
    return cote !== undefined ? `${base}${pick(rng, OUTSIDER_FLAVORS)(cote)}` : base;
  };

  if (rng() < 0.5) {
    const intro = pick(rng, [
      'Au programme côté pelouse :',
      'Le récap des matchs :',
      'Ce qu\'il fallait retenir des terrains :',
      'Petit tour des résultats :',
    ]);
    const clauses = facts.matches.map(matchClause);
    sections.push(`⚡ ${intro} ${clauses.join(' ; ')}.`);
  } else {
    const bullets = facts.matches.map((m) => {
      const emoji = coteByLabel.has(m.label) ? '🤯' : '⚽';
      const capped = matchClause(m).replace(/^./, (c) => c.toUpperCase());
      return `- ${emoji} ${capped}`;
    });
    sections.push(['Les résultats de la soirée :', ...bullets].join('\n'));
  }

  // --- Movable middle sections, shuffled so the order changes each day. ---
  const middle: string[] = [];

  if (climber || faller) {
    const parts: string[] = [];
    if (climber) {
      const places = `${climber.delta} place${climber.delta > 1 ? 's' : ''}`;
      parts.push(
        `**${climber.name}** ${pick(rng, CLIMB_VERBS)} de ${places} et pointe désormais au #${climber.to}`,
      );
    }
    if (faller) {
      parts.push(
        `**${faller.name}** ${pick(rng, FALL_VERBS)} jusqu'à la #${faller.to} (${faller.delta})`,
      );
    }
    middle.push(`📊 Au tableau, ${parts.join(', tandis que ')}.`);
  }

  const luckBits: string[] = [];
  if (luckiest && luckiest.luck > 0) {
    luckBits.push(
      pick(rng, [
        `**${luckiest.name}** a une chatte pas possible : ${luckiest.actual} puntos pour ${luckiest.expected} espérés (+${luckiest.luck})`,
        `le foot sourit à **${luckiest.name}**, ${luckiest.actual} puntos au compteur contre ${luckiest.expected} attendus (+${luckiest.luck})`,
      ]),
    );
  }
  if (unluckiest && unluckiest.luck < 0) {
    luckBits.push(
      pick(rng, [
        `à l'inverse **${unluckiest.name}** se fait dépouiller : ${unluckiest.actual} puntos alors qu'il en visait ${unluckiest.expected} (${unluckiest.luck})`,
        `**${unluckiest.name}**, lui, joue de malchance avec ${unluckiest.actual} puntos pour ${unluckiest.expected} mérités (${unluckiest.luck})`,
      ]),
    );
  }
  if (luckBits.length > 0) {
    middle.push(`🍀 Côté puntEV, ${luckBits.join(' ; ')}.`);
  }

  const streakBits: string[] = [];
  if (facts.currentWinStreak) {
    streakBits.push(
      `**${facts.currentWinStreak.name}** est en fusion avec ${facts.currentWinStreak.length} paris gagnés d'affilée 🔥`,
    );
  }
  if (facts.currentLossStreak) {
    streakBits.push(
      `**${facts.currentLossStreak.name}** s'enfonce avec ${facts.currentLossStreak.length} défaites de rang 💀`,
    );
  }
  if (streakBits.length > 0) {
    middle.push(streakBits.join(' — et '));
  }

  if (favouriteBet) {
    const chance =
      favouriteBet.victoryChance !== null ? ` (${favouriteBet.victoryChance}% de sacre)` : '';
    const pot =
      favouriteBet.puntosIfVictory !== null
        ? `, un jackpot de ${favouriteBet.puntosIfVictory} puntos à la clé`
        : '';
    const crowd =
      favouriteBet.backers.length > 1
        ? `${favouriteBet.backers.join(', ')} se partageraient le magot`
        : `${favouriteBet.backers[0]} rafle tout`;
    middle.push(
      pick(rng, [
        `🏆 Côté titre, **${favouriteBet.team}**${chance} reste le pari roi${pot} — ${crowd}.`,
        `🏆 Pour la victoire finale, **${favouriteBet.team}**${chance} a la cote${pot} — ${crowd}.`,
        `🏆 Et le sacre ? **${favouriteBet.team}**${chance} fait figure de favori${pot} — ${crowd}.`,
      ]),
    );
  }

  sections.push(...shuffle(rng, middle));
  sections.push(pick(rng, KICKERS));

  return { article: [title, '', sections.join('\n\n')].join('\n') };
};
