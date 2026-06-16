import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  PERSON_ON_PUNTOS_EVOLUTION_FIELD_UNIVERSAL_IDENTIFIER,
  PUNTOS_EVOLUTIONS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/fields/person-on-puntos-evolution.field';
import { PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/puntos-evolution.object';

export default defineField({
  universalIdentifier: PUNTOS_EVOLUTIONS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'puntosEvolutions',
  label: 'Puntos Evolutions',
  description: 'Cumulated puntos data points for this person',
  icon: 'IconChartLine',
  relationTargetObjectMetadataUniversalIdentifier: PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier:
    PERSON_ON_PUNTOS_EVOLUTION_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
