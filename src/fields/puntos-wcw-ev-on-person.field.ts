import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const PUNTOS_WCW_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  '761b101b-cff8-4b4d-9cbb-72f39dfcc04d';

export default defineField({
  universalIdentifier: PUNTOS_WCW_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'puntosWcwEv',
  label: 'Puntos + wcw ev',
  description: 'Sum of total puntos earned and the expected puntos from the World Cup winner bet',
  icon: 'IconTrophy',
  isNullable: true,
  defaultValue: null,
});
