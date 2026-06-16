import {
  defineField,
  FieldType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

export const WINNINGS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER =
  '77c12a95-9af0-45a8-9cc9-935b0d03872c';

export default defineField({
  universalIdentifier: WINNINGS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.NUMBER,
  name: 'winnings',
  label: 'Winnings (€)',
  description:
    'Share of the pot this person would cash out: 50% to 1st place, 30% to 2nd, 20% to 3rd, split across ties',
  icon: 'IconCash',
  isNullable: true,
  defaultValue: null,
});
