import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const WC_WINNER_BET_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  'e29eb3f0-187a-4e50-90f4-0b79384c1948';

export default defineField({
  universalIdentifier: WC_WINNER_BET_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.TEXT,
  name: 'wcWinnerBet',
  label: 'WC winner bet',
  description: 'Team this person predicted to win the World Cup',
  icon: 'IconTrophy',
});
