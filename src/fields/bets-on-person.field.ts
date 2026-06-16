import {
  defineField,
  FieldType,
  RelationType,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import {
  BETS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/fields/person-on-bet.field';
import { BET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/bet.object';

export default defineField({
  universalIdentifier: BETS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  type: FieldType.RELATION,
  name: 'bets',
  label: 'Bets',
  description: 'Bets placed by this person',
  icon: 'IconTrophy',
  relationTargetObjectMetadataUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
