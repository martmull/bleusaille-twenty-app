const FOOTBALL_DATA_API_URL = 'https://api.football-data.org/v4/competitions/WC/matches';
const FOOTBALL_DATA_API_TOKEN = process.env.FOOTBALL_DATA_API_TOKEN ?? '';

export const fetchWorldCupMatches = async <T>(): Promise<T[]> => {
  const response = await fetch(FOOTBALL_DATA_API_URL, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_API_TOKEN },
  });

  if (!response.ok) {
    throw new Error(`football-data.org request failed: ${response.status} ${response.statusText}`);
  }

  const { matches } = (await response.json()) as { matches: T[] };

  return matches;
};
