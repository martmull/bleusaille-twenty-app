import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import { PUNTOS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/puntos-on-person.field';

export const LEADERBOARD_VIEW_UNIVERSAL_IDENTIFIER =
  '72d92aad-e0a3-4578-8f2e-ed3f5d14f9d6';

export default defineView({
  universalIdentifier: LEADERBOARD_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Leaderboard',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconTrophy',
  fields: [
    {
      universalIdentifier: '31700177-4155-4680-8a6e-5a6e805109dc',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name
          .universalIdentifier,
      position: 0,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: '39336a99-0fd3-447f-994e-c599de206200',
      fieldMetadataUniversalIdentifier:
        PUNTOS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'fca13ae3-b81a-482b-8da3-582c06ab734d',
      fieldMetadataUniversalIdentifier:
        PUNTOS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      direction: ViewSortDirection.DESC,
    },
  ],
});
