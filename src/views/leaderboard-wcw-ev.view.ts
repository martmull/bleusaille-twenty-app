import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import { PUNTOS_WCW_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/puntos-wcw-ev-on-person.field';

export const LEADERBOARD_WCW_EV_VIEW_UNIVERSAL_IDENTIFIER =
  'ec4f7ab7-3f78-4a9c-a914-6ab888e4bcd4';

export default defineView({
  universalIdentifier: LEADERBOARD_WCW_EV_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Leaderboard + wcw ev',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconTrophy',
  fields: [
    {
      universalIdentifier: '2183672e-575e-4f62-8450-6a9dbcdce64c',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name
          .universalIdentifier,
      position: 0,
      isVisible: true,
      size: 160,
    },
    {
      universalIdentifier: '478375f4-c9ee-4f9b-a64d-580266a10975',
      fieldMetadataUniversalIdentifier:
        PUNTOS_WCW_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 180,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'e5d16e3a-95a3-49d1-8cd5-59c0a5082221',
      fieldMetadataUniversalIdentifier:
        PUNTOS_WCW_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      direction: ViewSortDirection.DESC,
    },
  ],
});
