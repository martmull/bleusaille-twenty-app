import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const PUNTEVS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  'd4e42e37-88c6-4c17-b030-bf89601e080a';

export default defineField({
  universalIdentifier: PUNTEVS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'puntevs',
  label: 'Puntevs',
  description: 'Total expected puntos (puntevs) across all bets',
  icon: 'IconChartLine',
  isNullable: true,
  defaultValue: null,
});
