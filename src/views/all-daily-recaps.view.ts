import { defineView, ViewKey, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import {
  DAILY_RECAP_ARTICLE_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER,
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
      universalIdentifier: 'edfd3821-10c0-47ff-bd48-c8f3be5f8b0e',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
    },
    {
      universalIdentifier: 'fabf3eda-ee00-4c5d-ba43-8807ae652189',
      fieldMetadataUniversalIdentifier: DAILY_RECAP_ARTICLE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 480,
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
