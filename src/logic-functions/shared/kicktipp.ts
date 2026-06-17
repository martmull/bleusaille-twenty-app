import {
  canonicalTeamName,
  teamPairKey,
} from 'src/logic-functions/shared/team-aliases';
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

const TIPPABGABE_URL = `${KICKTIPP_BASE_URL}/${KICKTIPP_COMMUNITY}/tippabgabe`;

const BET_VALUE_TO_SCORE: Record<BetValue, { home: number; away: number }> = {
  [BetValue.HOME_WIN]: { home: 1, away: 0 },
  [BetValue.NULL_OR_DRAW]: { home: 1, away: 1 },
  [BetValue.AWAY_WIN]: { home: 0, away: 1 },
};

export type KicktippTipSubmission = {
  home: string;
  away: string;
  betValue: BetValue;
};

export type KicktippFormMatch = {
  home: string;
  away: string;
  heimField: string;
  gastField: string;
};

export type KicktippTipField = {
  home: string;
  away: string;
  heimField: string;
  gastField: string;
  heimTipp: number;
  gastTipp: number;
  betValue: BetValue;
};

export type KicktippSubmissionResult = {
  submitted: boolean;
  matched: KicktippTipField[];
  unmatched: KicktippTipSubmission[];
  formMatches: Array<{ home: string; away: string }>;
};

export const buildKicktippTipFields = (
  formMatches: KicktippFormMatch[],
  predictions: KicktippTipSubmission[],
): { matched: KicktippTipField[]; unmatched: KicktippTipSubmission[] } => {
  const formByPair = new Map(
    formMatches.map((formMatch) => [
      teamPairKey(formMatch.home, formMatch.away),
      formMatch,
    ]),
  );

  const matched: KicktippTipField[] = [];
  const unmatched: KicktippTipSubmission[] = [];

  for (const prediction of predictions) {
    const formMatch = formByPair.get(
      teamPairKey(prediction.home, prediction.away),
    );

    if (!formMatch) {
      unmatched.push(prediction);
      continue;
    }

    const score = BET_VALUE_TO_SCORE[prediction.betValue];
    const sameOrientation =
      canonicalTeamName(formMatch.home) === canonicalTeamName(prediction.home);

    matched.push({
      home: formMatch.home,
      away: formMatch.away,
      heimField: formMatch.heimField,
      gastField: formMatch.gastField,
      heimTipp: sameOrientation ? score.home : score.away,
      gastTipp: sameOrientation ? score.away : score.home,
      betValue: prediction.betValue,
    });
  }

  return { matched, unmatched };
};

const fetchTippabgabePage = async (loginCookie: string): Promise<string> => {
  const response = await fetch(TIPPABGABE_URL, {
    headers: { Cookie: loginCookie },
  });

  if (!response.ok) {
    throw new Error(`Kicktipp tippabgabe fetch failed: ${response.status}`);
  }

  return response.text();
};

const getAttribute = (tag: string, attribute: string): string | undefined =>
  new RegExp(`${attribute}="([^"]*)"`).exec(tag)?.[1];

export const parseTippabgabeMatches = (html: string): KicktippFormMatch[] => {
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  const matches: KicktippFormMatch[] = [];

  for (const row of rows) {
    const rowHtml = row[1];

    const heimTag = /<input\b[^>]*\bname="([^"]*heimTipp[^"]*)"[^>]*>/i.exec(
      rowHtml,
    );
    const gastTag = /<input\b[^>]*\bname="([^"]*gastTipp[^"]*)"[^>]*>/i.exec(
      rowHtml,
    );

    if (!heimTag || !gastTag) {
      continue;
    }

    const cells = [...rowHtml.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(
      (cell) => stripTags(cell[1]),
    );

    const home = cells[1];
    const away = cells[2];

    if (!home || !away) {
      continue;
    }

    matches.push({
      home,
      away,
      heimField: heimTag[1],
      gastField: gastTag[1],
    });
  }

  return matches;
};

const extractTippabgabeForm = (html: string): string => {
  const forms = [...html.matchAll(/<form\b[^>]*>([\s\S]*?)<\/form>/gi)];
  const tippForm = forms.find((form) => /heimTipp/i.test(form[1]));
  return tippForm ? tippForm[1] : html;
};

const collectFormFields = (formHtml: string): URLSearchParams => {
  const body = new URLSearchParams();

  for (const input of formHtml.matchAll(/<input\b[^>]*>/gi)) {
    const tag = input[0];

    if (/type="submit"/i.test(tag)) {
      continue;
    }

    const name = getAttribute(tag, 'name');

    if (!name) {
      continue;
    }

    body.set(name, getAttribute(tag, 'value') ?? '');
  }

  return body;
};

const parseSubmitButton = (
  formHtml: string,
): { name: string; value: string } | null => {
  const buttonTag = /<input[^>]+type="submit"[^>]*>/i.exec(formHtml)?.[0];

  if (!buttonTag) {
    return null;
  }

  const name = getAttribute(buttonTag, 'name');

  return name ? { name, value: getAttribute(buttonTag, 'value') ?? '' } : null;
};

export const debugTippabgabe = async () => {
  if (!KICKTIPP_EMAIL || !KICKTIPP_PASSWORD) {
    throw new Error('Kicktipp credentials are not configured');
  }

  const loginCookie = await loginToKicktipp(KICKTIPP_EMAIL, KICKTIPP_PASSWORD);
  const response = await fetch(TIPPABGABE_URL, {
    headers: { Cookie: loginCookie },
  });
  const html = await response.text();

  const snippet = (needle: string): string | null => {
    const index = html.toLowerCase().indexOf(needle.toLowerCase());
    return index < 0
      ? null
      : html.slice(Math.max(0, index - 400), index + 600);
  };

  return {
    url: TIPPABGABE_URL,
    status: response.status,
    finalUrl: response.url,
    htmlLength: html.length,
    formCount: (html.match(/<form/gi) ?? []).length,
    inputCount: (html.match(/<input/gi) ?? []).length,
    looksLikeLoginPage: /kennung|passwort|loginformular/i.test(html),
    inputTags: [...html.matchAll(/<input\b[^>]*>/gi)]
      .map((match) => match[0])
      .filter((tag) => /tipp|spiel/i.test(tag))
      .slice(0, 12),
    snippets: {
      heimTipp: snippet('heimTipp'),
      spieltipp: snippet('spieltipp'),
      tippabgabe: snippet('tippabgabe'),
    },
  };
};

export const submitKicktippTips = async (
  predictions: KicktippTipSubmission[],
  dryRun: boolean,
): Promise<KicktippSubmissionResult> => {
  if (!KICKTIPP_EMAIL || !KICKTIPP_PASSWORD) {
    throw new Error('Kicktipp credentials are not configured');
  }

  const loginCookie = await loginToKicktipp(KICKTIPP_EMAIL, KICKTIPP_PASSWORD);
  const html = await fetchTippabgabePage(loginCookie);
  const formHtml = extractTippabgabeForm(html);
  const formMatches = parseTippabgabeMatches(formHtml);
  const { matched, unmatched } = buildKicktippTipFields(formMatches, predictions);

  const formMatchSummary = formMatches.map((formMatch) => ({
    home: formMatch.home,
    away: formMatch.away,
  }));

  if (dryRun || matched.length === 0) {
    return {
      submitted: false,
      matched,
      unmatched,
      formMatches: formMatchSummary,
    };
  }

  const body = collectFormFields(formHtml);

  for (const field of matched) {
    body.set(field.heimField, String(field.heimTipp));
    body.set(field.gastField, String(field.gastTipp));
  }

  const submitButton = parseSubmitButton(formHtml);

  if (submitButton) {
    body.set(submitButton.name, submitButton.value);
  }

  const response = await fetch(TIPPABGABE_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: loginCookie,
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new Error(`Kicktipp tip submission failed: ${response.status}`);
  }

  return {
    submitted: true,
    matched,
    unmatched,
    formMatches: formMatchSummary,
  };
};
