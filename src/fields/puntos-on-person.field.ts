import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const PUNTOS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  '4cd095b3-f0f3-4363-895d-61312731d26c';

export default defineField({
  universalIdentifier: PUNTOS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'puntos',
  label: 'Puntos',
  description: 'Total puntos earned across all bets',
  icon: 'IconTrophy',
  isNullable: true,
  defaultValue: null,
});
