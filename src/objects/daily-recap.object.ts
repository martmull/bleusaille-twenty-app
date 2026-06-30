import { defineObject, FieldType } from 'twenty-sdk/define';

export const DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER =
  '0d9aebc5-b0f9-4376-87a6-5b512ad4dca3';

export const DAILY_RECAP_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'cb22afde-9d75-4957-943e-d5328b063d43';
export const DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER =
  'eddfae52-6d8c-4194-9040-9feea940b504';
export const DAILY_RECAP_ARTICLE_FIELD_UNIVERSAL_IDENTIFIER =
  '756d3472-7baa-4dc0-9641-d98696148dbb';

export default defineObject({
  universalIdentifier: DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'dailyRecap',
  namePlural: 'dailyRecaps',
  labelSingular: 'Daily Recap',
  labelPlural: 'Daily Recaps',
  description:
    'A funny free-form morning chronicle of the previous day, written as a rich markdown article.',
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
      universalIdentifier: DAILY_RECAP_ARTICLE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'article',
      label: 'Article',
      description:
        'The full free-form chronicle of the day, in markdown (title, paragraphs, bullet points, emojis and stats)',
      icon: 'IconArticle',
    },
  ],
});
