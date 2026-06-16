import { defineObject, FieldType } from 'twenty-sdk/define';

export const MATCH_OBJECT_UNIVERSAL_IDENTIFIER = '15832b03-f84b-46f4-8ede-c831551241fd';

export const MATCH_NAME_FIELD_UNIVERSAL_IDENTIFIER = '832ee7d9-f6f0-46ec-bcb1-3420dc77a0d0';
export const MATCH_HOME_FIELD_UNIVERSAL_IDENTIFIER = 'a61f7ad3-6cc0-4b4f-b64b-ebac72477760';
export const MATCH_AWAY_FIELD_UNIVERSAL_IDENTIFIER = '3d3a6d55-a7be-4811-925a-973e7be8a27f';
export const MATCH_START_DATE_FIELD_UNIVERSAL_IDENTIFIER = 'ca43584d-6cbb-4fa9-aee1-05e617862b53';
export const MATCH_END_DATE_FIELD_UNIVERSAL_IDENTIFIER = 'c452a4a3-8d18-4c70-94ea-fbede45cf175';
export const MATCH_SCORE_FIELD_UNIVERSAL_IDENTIFIER = '70abcc32-61ff-476c-8a10-87c73d672f84';
export const MATCH_RESULT_FIELD_UNIVERSAL_IDENTIFIER = 'e7e85058-4981-40e7-a7d6-dc4f68a8ded4';
export const MATCH_TYPE_FIELD_UNIVERSAL_IDENTIFIER = '53a81618-09c7-491b-9c24-274695e818be';
export const MATCH_HOME_QUOTE_FIELD_UNIVERSAL_IDENTIFIER = '41ba7899-3d4c-462e-bc63-30fbb20f0995';
export const MATCH_DRAW_QUOTE_FIELD_UNIVERSAL_IDENTIFIER = 'dda5fee5-2074-483a-8c1e-849b37910d70';
export const MATCH_AWAY_QUOTE_FIELD_UNIVERSAL_IDENTIFIER = '44e3ab6e-624d-4c5c-a6ad-5e7dbcad97f1';
export const MATCH_HOME_BREAKEVEN_FIELD_UNIVERSAL_IDENTIFIER = '1849bd3f-22be-43c6-a805-ca1d31002de1';
export const MATCH_DRAW_BREAKEVEN_FIELD_UNIVERSAL_IDENTIFIER = 'd75bd023-597c-4f8b-83b8-10298051852a';
export const MATCH_AWAY_BREAKEVEN_FIELD_UNIVERSAL_IDENTIFIER = 'c94e581a-78bb-447c-b11a-1b71ab331010';

export enum MatchResult {
  HOME_WIN = 'HOME_WIN',
  NULL_OR_DRAW = 'NULL_OR_DRAW',
  AWAY_WIN = 'AWAY_WIN',
}

export enum MatchType {
  GROUP_STAGE = 'GROUP_STAGE',
  LAST_32 = 'LAST_32',
  LAST_16 = 'LAST_16',
  QUARTER_FINALS = 'QUARTER_FINALS',
  SEMI_FINALS = 'SEMI_FINALS',
  THIRD_PLACE = 'THIRD_PLACE',
  FINAL = 'FINAL',
}

export default defineObject({
  universalIdentifier: MATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'match',
  namePlural: 'matches',
  labelSingular: 'Match',
  labelPlural: 'Matches',
  description: 'Football match records with teams, start date, score, and result.',
  icon: 'IconBallFootball',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: MATCH_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: MATCH_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      description: 'Name',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: MATCH_HOME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'home',
      label: 'Home',
      description: 'Home team',
      icon: 'IconHome',
    },
    {
      universalIdentifier: MATCH_AWAY_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'away',
      label: 'Away',
      description: 'Away team',
      icon: 'IconPlaneDeparture',
    },
    {
      universalIdentifier: MATCH_START_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      name: 'startDate',
      label: 'Start Date',
      description: 'Match start date and time',
      icon: 'IconCalendarEvent',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: MATCH_END_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      name: 'endDate',
      label: '~ End Date',
      description: 'Match end date and time',
      icon: 'IconCalendarEvent',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: MATCH_SCORE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'score',
      label: 'Score',
      description: 'Match score, for example 2-1',
      icon: 'IconScoreboard',
    },
    {
      universalIdentifier: MATCH_RESULT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'result',
      label: 'Result',
      description: 'Result: 1 = home win, 0 = null/draw, 2 = away win',
      icon: 'IconTrophy',
      isNullable: true,
      options: [
        {
          id: 'ee528164-05b9-4e99-b07d-05e0e846854d',
          value: MatchResult.HOME_WIN,
          label: '1',
          position: 0,
          color: 'green',
        },
        {
          id: 'e64678e2-4a63-4b67-af0c-a3a7b20abe7f',
          value: MatchResult.NULL_OR_DRAW,
          label: '0',
          position: 1,
          color: 'gray',
        },
        {
          id: 'f5c1a38c-497b-4b79-9027-7ebb7b6d4a1b',
          value: MatchResult.AWAY_WIN,
          label: '2',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: MATCH_TYPE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'stage',
      label: 'Type',
      description: 'Competition stage of the match',
      icon: 'IconTournament',
      isNullable: true,
      options: [
        {
          id: 'c96e8a87-4317-4563-900a-e6c2d0400eb5',
          value: MatchType.GROUP_STAGE,
          label: 'Pool',
          position: 0,
          color: 'blue',
        },
        {
          id: 'f3a818a1-3804-4495-b685-48181bb070b0',
          value: MatchType.LAST_32,
          label: 'Round of 32',
          position: 1,
          color: 'sky',
        },
        {
          id: '45d6bbc5-0dfd-4ba1-9bfa-1e4fa26ab4f5',
          value: MatchType.LAST_16,
          label: 'Round of 16',
          position: 2,
          color: 'turquoise',
        },
        {
          id: 'f26e86ec-7e22-40e6-822d-cd1d6f85ff01',
          value: MatchType.QUARTER_FINALS,
          label: 'Quarter-finals',
          position: 3,
          color: 'yellow',
        },
        {
          id: '79839816-ca12-4b8b-983c-d4ced909222e',
          value: MatchType.SEMI_FINALS,
          label: 'Semi-finals',
          position: 4,
          color: 'orange',
        },
        {
          id: 'f9f1f143-c367-4500-bcf5-ac085a4f9598',
          value: MatchType.THIRD_PLACE,
          label: 'Third place',
          position: 5,
          color: 'purple',
        },
        {
          id: '30aa1993-89dd-4fa5-b828-ca50e21f83b0',
          value: MatchType.FINAL,
          label: 'Final',
          position: 6,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: MATCH_HOME_QUOTE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'homeQuote',
      label: 'Home Quote',
      description: 'Live decimal odds for a home win (only for upcoming matches of the day)',
      icon: 'IconHome',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: MATCH_DRAW_QUOTE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'drawQuote',
      label: 'Draw Quote',
      description: 'Live decimal odds for a draw (only for upcoming matches of the day)',
      icon: 'IconEqual',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: MATCH_AWAY_QUOTE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'awayQuote',
      label: 'Away Quote',
      description: 'Live decimal odds for an away win (only for upcoming matches of the day)',
      icon: 'IconPlaneDeparture',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: MATCH_HOME_BREAKEVEN_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'homeBreakeven',
      label: 'Home Breakeven',
      description:
        'Max bettors on a home win before the local pool quote (total bets / bettors on home) drops below the live home quote',
      icon: 'IconHome',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: MATCH_DRAW_BREAKEVEN_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'drawBreakeven',
      label: 'Draw Breakeven',
      description:
        'Max bettors on a draw before the local pool quote (total bets / bettors on draw) drops below the live draw quote',
      icon: 'IconEqual',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: MATCH_AWAY_BREAKEVEN_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'awayBreakeven',
      label: 'Away Breakeven',
      description:
        'Max bettors on an away win before the local pool quote (total bets / bettors on away) drops below the live away quote',
      icon: 'IconPlaneDeparture',
      isNullable: true,
      defaultValue: null,
    },
  ],
});
