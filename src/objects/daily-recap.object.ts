import { defineObject, FieldType } from 'twenty-sdk/define';

export const DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER =
  '0d9aebc5-b0f9-4376-87a6-5b512ad4dca3';

export const DAILY_RECAP_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'cb22afde-9d75-4957-943e-d5328b063d43';
export const DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER =
  'eddfae52-6d8c-4194-9040-9feea940b504';
export const DAILY_RECAP_HEADLINE_FIELD_UNIVERSAL_IDENTIFIER =
  '132ded8b-c428-4d5b-a1f4-d57f7b052835';
export const DAILY_RECAP_ARTICLE_FIELD_UNIVERSAL_IDENTIFIER =
  '9f489ce3-da70-4627-9f72-989761367ca9';
export const DAILY_RECAP_RANKING_MOVES_FIELD_UNIVERSAL_IDENTIFIER =
  '1ba5cad5-9875-425c-9663-2437c71546dd';
export const DAILY_RECAP_NOTABLE_RESULTS_FIELD_UNIVERSAL_IDENTIFIER =
  'b7707c2d-f11c-4f05-ad5e-9e8a1e858eb4';
export const DAILY_RECAP_FUN_FACT_FIELD_UNIVERSAL_IDENTIFIER =
  'b7dc1494-a233-4bc3-90c9-1f3ed5974a49';
export const DAILY_RECAP_MOOD_FIELD_UNIVERSAL_IDENTIFIER =
  'bdc4806d-358d-4904-81a5-afe2b121ff68';

export default defineObject({
  universalIdentifier: DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'dailyRecap',
  namePlural: 'dailyRecaps',
  labelSingular: 'Daily Recap',
  labelPlural: 'Daily Recaps',
  description:
    'A funny morning recap of the previous day: ranking moves, notable results and a fun fact about bettors.',
  icon: 'IconNews',
  isSearchable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    DAILY_RECAP_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: DAILY_RECAP_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      description: 'Name',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      name: 'recapDate',
      label: 'Recap Date',
      description: 'Midnight UTC of the day this recap is about',
      icon: 'IconCalendarEvent',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: DAILY_RECAP_HEADLINE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'headline',
      label: 'Headline',
      description: 'Punchy funny headline for the day',
      icon: 'IconHeadline',
    },
    {
      universalIdentifier: DAILY_RECAP_ARTICLE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'article',
      label: 'Article',
      description: 'Long-form funny write-up of the day',
      icon: 'IconArticle',
    },
    {
      universalIdentifier: DAILY_RECAP_RANKING_MOVES_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'rankingMoves',
      label: 'Ranking Moves',
      description: 'Story of the major ranking evolutions of the day',
      icon: 'IconArrowsUpDown',
    },
    {
      universalIdentifier: DAILY_RECAP_NOTABLE_RESULTS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'notableResults',
      label: 'Notable Results',
      description: 'Notable match results such as an outsider winning',
      icon: 'IconBallFootball',
    },
    {
      universalIdentifier: DAILY_RECAP_FUN_FACT_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'funFact',
      label: 'Fun Fact',
      description: 'A fun fact about the bettors (streaks, flops, etc.)',
      icon: 'IconConfetti',
    },
    {
      universalIdentifier: DAILY_RECAP_MOOD_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'mood',
      label: 'Mood',
      description: 'A single emoji capturing the mood of the day',
      icon: 'IconMoodSmile',
    },
  ],
});
