import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/puntos-evolution.object';

export const PERSON_ON_PUNTOS_EVOLUTION_FIELD_UNIVERSAL_IDENTIFIER =
  'f02af1eb-42bf-40ea-ac38-4a69775c1ac0';
export const PUNTOS_EVOLUTIONS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  'fd823ce5-311e-4a1b-ac97-7de163138f2b';

export default defineField({
  universalIdentifier: PERSON_ON_PUNTOS_EVOLUTION_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'person',
  label: 'Person',
  description: 'Person this data point belongs to',
  icon: 'IconUser',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier:
    PUNTOS_EVOLUTIONS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'personId',
  },
});
