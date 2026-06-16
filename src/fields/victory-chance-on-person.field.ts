import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const VICTORY_CHANCE_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  '0f56d633-6dbd-4a07-8a72-299bb346d24b';

export default defineField({
  universalIdentifier: VICTORY_CHANCE_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'victoryChance',
  label: 'Victory chance (%)',
  description:
    'Bookmaker-implied probability (%) that this person’s predicted World Cup winner lifts the trophy',
  icon: 'IconPercentage',
  isNullable: true,
  defaultValue: null,
});
