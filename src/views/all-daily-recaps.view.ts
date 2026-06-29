import { defineView, ViewKey, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import {
  DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_FUN_FACT_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_HEADLINE_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_MOOD_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_NOTABLE_RESULTS_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_RANKING_MOVES_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/objects/daily-recap.object';

export const ALL_DAILY_RECAPS_VIEW_UNIVERSAL_IDENTIFIER =
  '8d7ef480-d896-4713-9a75-f5e640a715dc';

export default defineView({
  universalIdentifier: ALL_DAILY_RECAPS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All Daily Recaps',
  objectUniversalIdentifier: DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  key: ViewKey.INDEX,
  icon: 'IconNews',
  fields: [
    {
      universalIdentifier: '866ac4bd-0b1c-430f-9094-2ad8492ba244',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: 'bd3102ef-1edc-4987-8e52-b51a60845f84',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_MOOD_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 80,
    },
    {
      universalIdentifier: 'edfd3821-10c0-47ff-bd48-c8f3be5f8b0e',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
    },
    {
      universalIdentifier: 'fabf3eda-ee00-4c5d-ba43-8807ae652189',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_HEADLINE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: 'c5eb3701-72f5-4aaa-855b-97fbeba0de99',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_RANKING_MOVES_FIELD_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: '39661f66-0b8b-459b-b7a1-17b4822b3969',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_NOTABLE_RESULTS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 280,
    },
    {
      universalIdentifier: 'ee784c7c-a95e-459e-925c-6c259867b96f',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_FUN_FACT_FIELD_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
      size: 280,
    },
  ],
  sorts: [
    {
      universalIdentifier: '7d6d470f-b8d0-4e69-9d5d-5b640c521917',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      direction: ViewSortDirection.DESC,
    },
  ],
});
