import {
  defineView,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
  ViewSortDirection,
  ViewType,
} from 'twenty-sdk/define';

import { PUNTEVS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/puntevs-on-person.field';

export const LEADERBOARD_PUNTEVS_VIEW_UNIVERSAL_IDENTIFIER =
  '106674bd-1b7e-4450-814a-8a0b092e09f5';

export default defineView({
  universalIdentifier: LEADERBOARD_PUNTEVS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'Leaderboard puntevs',
  objectUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: ViewType.TABLE_WIDGET,
  icon: 'IconTrophy',
  fields: [
    {
      universalIdentifier: '94181397-4104-47ec-9fda-ed7c2ecae70c',
      fieldMetadataUniversalIdentifier:
        STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.fields.name
          .universalIdentifier,
      position: 0,
      isVisible: true,
      size: 140,
    },
    {
      universalIdentifier: '161ed9ed-5380-4099-98e2-b711710b0af5',
      fieldMetadataUniversalIdentifier:
        PUNTEVS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 100,
    },
  ],
  sorts: [
    {
      universalIdentifier: '29e5e516-054d-4520-9070-ca839cbe4bd1',
      fieldMetadataUniversalIdentifier:
        PUNTEVS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
      direction: ViewSortDirection.DESC,
    },
  ],
});
