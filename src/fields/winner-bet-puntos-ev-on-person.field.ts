import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const WINNER_BET_PUNTOS_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  'f929d3de-3d39-4ad8-be2f-f15d418c80e0';

export default defineField({
  universalIdentifier: WINNER_BET_PUNTOS_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'winnerBetPuntosEv',
  label: 'Winner bet puntos ev',
  description:
    'Expected puntos from the World Cup winner bet, weighted by the predicted team’s win probability',
  icon: 'IconTrophy',
  isNullable: true,
  defaultValue: null,
});
