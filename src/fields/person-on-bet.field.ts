import {
  defineField,
  FieldType,
  OnDeleteAction,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { BET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/bet.object';

export const PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER = 'a12d923c-829e-4067-bee9-071f8314d81f';
export const BETS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER = '3827c496-7526-41a4-818c-aa5869126c1c';

export default defineField({
  universalIdentifier: PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'person',
  label: 'Person',
  description: 'Person who placed the bet',
  icon: 'IconUser',
  relationTargetObjectMetadataUniversalIdentifier:
    STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  relationTargetFieldMetadataUniversalIdentifier: BETS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'personId',
  },
});
