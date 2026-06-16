import { defineField, FieldType, RelationType } from 'twenty-sdk/define';

import {
  BETS_ON_MATCH_FIELD_UNIVERSAL_IDENTIFIER,
  MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/fields/match-on-bet.field';
import { BET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/bet.object';
import { MATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/match.object';

export default defineField({
  universalIdentifier: BETS_ON_MATCH_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: MATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'bets',
  label: 'Bets',
  description: 'Bets placed on this match',
  icon: 'IconTrophy',
  relationTargetObjectMetadataUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.ONE_TO_MANY,
  },
});
