import { defineView, ViewKey, ViewSortDirection, ViewType } from 'twenty-sdk/define';

import { PERSON_ON_PUNTOS_EVOLUTION_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/person-on-puntos-evolution.field';
import {
  PUNTOS_EVOLUTION_MATCH_END_DATE_FIELD_UNIVERSAL_IDENTIFIER,
  PUNTOS_EVOLUTION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER,
  PUNTOS_EVOLUTION_POINTS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/objects/puntos-evolution.object';

export const ALL_PUNTOS_EVOLUTIONS_VIEW_UNIVERSAL_IDENTIFIER =
  'c54bb890-77b7-45d6-a58f-db34d271b3a8';

export default defineView({
  universalIdentifier: ALL_PUNTOS_EVOLUTIONS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All Puntos Evolutions',
  objectUniversalIdentifier: PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  key: ViewKey.INDEX,
  icon: 'IconChartLine',
  fields: [
    {
      universalIdentifier: 'd2ded736-d56d-43f8-9c6b-deb90ec0f2a8',
      fieldMetadataUniversalIdentifier: PUNTOS_EVOLUTION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
    },
    {
      universalIdentifier: '2f2ce9fa-99ee-492f-b5b4-59fdab187cf1',
      fieldMetadataUniversalIdentifier: PERSON_ON_PUNTOS_EVOLUTION_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
    },
    {
      universalIdentifier: '019ae3b7-5555-4d6c-b64f-384f43e32c5b',
      fieldMetadataUniversalIdentifier: PUNTOS_EVOLUTION_MATCH_END_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
    },
    {
      universalIdentifier: '89412121-78cb-42b6-9ebf-9b1900085935',
      fieldMetadataUniversalIdentifier: PUNTOS_EVOLUTION_POINTS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
    },
  ],
  sorts: [
    {
      universalIdentifier: 'f76956af-4ed4-43e2-957d-29b888ebf69b',
      fieldMetadataUniversalIdentifier: PUNTOS_EVOLUTION_MATCH_END_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      direction: ViewSortDirection.ASC,
    },
  ],
});
