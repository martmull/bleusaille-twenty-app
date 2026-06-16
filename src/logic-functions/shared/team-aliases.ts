import { normalizeTeamName } from 'src/logic-functions/shared/api';

const NORMALIZED_ALIASES: Record<string, string> = {
  bosnienherzegowina: 'bosniaherzegovina',
  capeverde: 'capeverdeislands',
  czechrepublic: 'czechia',
  drcongo: 'congodr',
  turkiye: 'turkey',
  usa: 'unitedstates',
};

export const canonicalTeamName = (teamName: string): string => {
  const normalized = normalizeTeamName(teamName);
  return NORMALIZED_ALIASES[normalized] ?? normalized;
};

export const matchKey = (home: string, away: string): string =>
  `${canonicalTeamName(home)}|${canonicalTeamName(away)}`;

export const teamPairKey = (a: string, b: string): string =>
  [canonicalTeamName(a), canonicalTeamName(b)].sort().join('|');
