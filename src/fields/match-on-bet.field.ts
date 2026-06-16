import { defineField, FieldType, OnDeleteAction, RelationType } from 'twenty-sdk/define';

import { BET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/bet.object';
import { MATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/match.object';

export const MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER = '672e6158-8dbe-4a05-bdb3-2a892d0dfd93';
export const BETS_ON_MATCH_FIELD_UNIVERSAL_IDENTIFIER = '90e0ca79-178a-462c-9df4-53b7f0bfc75f';

export default defineField({
  universalIdentifier: MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
  objectUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
  type: FieldType.RELATION,
  name: 'match',
  label: 'Match',
  description: 'Match this bet is for',
  icon: 'IconBallFootball',
  relationTargetObjectMetadataUniversalIdentifier: MATCH_OBJECT_UNIVERSAL_IDENTIFIER,
  relationTargetFieldMetadataUniversalIdentifier: BETS_ON_MATCH_FIELD_UNIVERSAL_IDENTIFIER,
  universalSettings: {
    relationType: RelationType.MANY_TO_ONE,
    onDelete: OnDeleteAction.SET_NULL,
    joinColumnName: 'matchId',
  },
});
