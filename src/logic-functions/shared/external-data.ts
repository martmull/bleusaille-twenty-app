import {
  KicktippBet,
  KicktippWcWinner,
  scrapeKicktippBets,
  scrapeKicktippWcWinners,
} from 'src/logic-functions/shared/kicktipp';
import {
  fetchMatchResultChances,
  fetchWorldCupWinnerChances,
  MatchResultChances,
} from 'src/logic-functions/shared/odds';
import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';
import type { FootballDataMatch } from 'src/logic-functions/shared/steps/sync-matches.step';

export type ExternalData = {
  kicktippBets?: KicktippBet[];
  worldCupMatches?: FootballDataMatch[];
  kicktippWcWinners?: KicktippWcWinner[];
  worldCupWinnerChances?: Map<string, number>;
  matchResultChances?: Map<string, MatchResultChances>;
};

export type ExternalApiCall = keyof ExternalData;

const FETCHERS: {
  [K in ExternalApiCall]: () => Promise<NonNullable<ExternalData[K]>>;
} = {
  kicktippBets: scrapeKicktippBets,
  worldCupMatches: () => fetchWorldCupMatches<FootballDataMatch>(),
  kicktippWcWinners: scrapeKicktippWcWinners,
  worldCupWinnerChances: fetchWorldCupWinnerChances,
  matchResultChances: fetchMatchResultChances,
};

export const fetchExternalData = async (
  options: { ignore?: ExternalApiCall[] } = {},
): Promise<ExternalData> => {
  const ignore = new Set(options.ignore ?? []);
  const data: ExternalData = {};

  await Promise.all(
    (Object.keys(FETCHERS) as ExternalApiCall[])
      .filter((key) => !ignore.has(key))
      .map(async (key) => {
        Object.assign(data, { [key]: await FETCHERS[key]() });
      }),
  );

  return data;
};
