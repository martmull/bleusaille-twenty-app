import { BetValue } from 'src/objects/bet.object';

export const KICKTIPP_EMAIL = process.env.KICKTIPP_EMAIL ?? '';
export const KICKTIPP_PASSWORD = process.env.KICKTIPP_PASSWORD ?? '';

const KICKTIPP_BASE_URL = 'https://www.kicktipp.co.uk';
const KICKTIPP_LOGIN_URL = `${KICKTIPP_BASE_URL}/info/profil/loginaction`;
const KICKTIPP_COMMUNITY = 'la-bleusaille-aux-states';
const KICKTIPP_SEASON_ID = '4295680';

export const KICKTIPP_MATCHDAY_COUNT = 15;

export type KicktippMatch = {
  home: string;
  away: string;
};

export type KicktippBet = {
  player: string;
  match: KicktippMatch;
  betValue: BetValue;
};

const TENDENCY_TO_BET_VALUE: Record<string, BetValue> = {
  '1': BetValue.HOME_WIN,
  '0': BetValue.NULL_OR_DRAW,
  '2': BetValue.AWAY_WIN,
};

const stripTags = (html: string): string => html.replace(/<[^>]*>/g, '').trim();

const extractTable = (html: string, tableId: string): string | null => {
  const match = new RegExp(`<table id="${tableId}"[\\s\\S]*?</table>`).exec(html);
  return match ? match[0] : null;
};

export const loginToKicktipp = async (email: string, password: string): Promise<string> => {
  const body = new URLSearchParams({
    kennung: email,
    passwort: password,
    submitbutton: 'Log in',
  });

  const response = await fetch(KICKTIPP_LOGIN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
    redirect: 'manual',
  });

  const setCookie = response.headers.get('set-cookie') ?? '';
  const loginCookie = /login=[^;]+/.exec(setCookie)?.[0];

  if (!loginCookie) {
    throw new Error('Kicktipp login failed: no login cookie returned');
  }

  return loginCookie;
};

const fetchLeaderboardPage = async (
  loginCookie: string,
  matchdayIndex: number,
): Promise<string> => {
  const url = `${KICKTIPP_BASE_URL}/${KICKTIPP_COMMUNITY}/leaderboard?tippsaisonId=${KICKTIPP_SEASON_ID}&spieltagIndex=${matchdayIndex}`;

  const response = await fetch(url, {
    headers: { Cookie: loginCookie },
  });

  if (!response.ok) {
    throw new Error(`Kicktipp leaderboard fetch failed (matchday ${matchdayIndex}): ${response.status}`);
  }

  return response.text();
};

const parseMatches = (html: string): KicktippMatch[] => {
  const table = extractTable(html, 'spielplanSpiele');
  if (!table) {
    return [];
  }

  const rows = [...table.matchAll(/<tr class="clickable"[^>]*>([\s\S]*?)<\/tr>/g)];

  return rows.map((row) => {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    return { home: cells[1] ?? '', away: cells[2] ?? '' };
  });
};

const parsePlayerBets = (html: string, matches: KicktippMatch[]): KicktippBet[] => {
  const table = extractTable(html, 'ranking');
  if (!table) {
    return [];
  }

  const tbody = table.slice(table.indexOf('<tbody'));
  const playerRows = [...tbody.matchAll(/<tr class="[^"]*teilnehmer[^"]*"[^>]*>([\s\S]*?)<\/tr>/g)];

  const bets: KicktippBet[] = [];

  for (const playerRow of playerRows) {
    const rowHtml = playerRow[1];
    const playerName = /mg_name">([^<]*)<\/div>/.exec(rowHtml)?.[1]?.trim();

    if (!playerName) {
      continue;
    }

    const tipCells = [...rowHtml.matchAll(/<td class="nw [tf] ereignis ereignis(\d+)">([\s\S]*?)<\/td>/g)];

    for (const tipCell of tipCells) {
      const eventIndex = Number(tipCell[1]);
      const tendency = stripTags(tipCell[2].replace(/<sub[\s\S]*?<\/sub>/g, ''));
      const betValue = TENDENCY_TO_BET_VALUE[tendency];
      const match = matches[eventIndex];

      if (!betValue || !match || !match.home || !match.away) {
        continue;
      }

      bets.push({ player: playerName, match, betValue });
    }
  }

  return bets;
};

export const fetchAllKicktippBets = async (loginCookie: string): Promise<KicktippBet[]> => {
  const bets: KicktippBet[] = [];

  for (let matchdayIndex = 1; matchdayIndex <= KICKTIPP_MATCHDAY_COUNT; matchdayIndex += 1) {
    const html = await fetchLeaderboardPage(loginCookie, matchdayIndex);
    const matches = parseMatches(html);
    bets.push(...parsePlayerBets(html, matches));
  }

  return bets;
};

export const scrapeKicktippBets = async (): Promise<KicktippBet[]> => {
  const loginCookie = await loginToKicktipp(KICKTIPP_EMAIL, KICKTIPP_PASSWORD);
  return fetchAllKicktippBets(loginCookie);
};

export type KicktippWcWinner = {
  player: string;
  team: string;
};

const fetchBonusPage = async (loginCookie: string): Promise<string> => {
  const url = `${KICKTIPP_BASE_URL}/${KICKTIPP_COMMUNITY}/leaderboard?tippsaisonId=${KICKTIPP_SEASON_ID}&bonus=true&spieltagIndex=1`;

  const response = await fetch(url, {
    headers: { Cookie: loginCookie },
  });

  if (!response.ok) {
    throw new Error(`Kicktipp bonus fetch failed: ${response.status}`);
  }

  return response.text();
};

const findWcQuestionIndex = (html: string): number => {
  const table = extractTable(html, 'spielplanFragen');
  if (!table) {
    return 0;
  }

  const rows = [...table.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  let questionIndex = 0;

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((cell) => stripTags(cell[1]));
    if (cells.length === 0) {
      continue;
    }
    if (cells.some((cell) => cell === 'WC')) {
      return questionIndex;
    }
    questionIndex += 1;
  }

  return 0;
};

const parseWcWinners = (html: string): KicktippWcWinner[] => {
  const table = extractTable(html, 'ranking');
  if (!table) {
    return [];
  }

  const wcIndex = findWcQuestionIndex(html);
  const tbody = table.slice(table.indexOf('<tbody'));
  const playerRows = [...tbody.matchAll(/<tr class="[^"]*teilnehmer[^"]*"[^>]*>([\s\S]*?)<\/tr>/g)];

  const winners: KicktippWcWinner[] = [];

  for (const playerRow of playerRows) {
    const rowHtml = playerRow[1];
    const playerName = /mg_name">([^<]*)<\/div>/.exec(rowHtml)?.[1]?.trim();

    if (!playerName) {
      continue;
    }

    const answerCell = new RegExp(
      `<td class="[^"]*ereignis${wcIndex}"[^>]*data-antwort="([^"]*)"`,
    ).exec(rowHtml);
    const team = answerCell?.[1]?.trim();

    if (!team) {
      continue;
    }

    winners.push({ player: playerName, team });
  }

  return winners;
};

export const scrapeKicktippWcWinners = async (): Promise<KicktippWcWinner[]> => {
  const loginCookie = await loginToKicktipp(KICKTIPP_EMAIL, KICKTIPP_PASSWORD);
  const html = await fetchBonusPage(loginCookie);
  return parseWcWinners(html);
};
