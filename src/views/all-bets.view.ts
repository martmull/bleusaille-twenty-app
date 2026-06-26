import { defineView, ViewKey, ViewType } from 'twenty-sdk/define';

import { MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/match-on-bet.field';
import { PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/person-on-bet.field';
import {
  BET_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  BET_OBJECT_UNIVERSAL_IDENTIFIER,
  BET_PUNTEVS_FIELD_UNIVERSAL_IDENTIFIER,
  BET_PUNTOS_FIELD_UNIVERSAL_IDENTIFIER,
  BET_VALUE_FIELD_UNIVERSAL_IDENTIFIER,
  BET_WON_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/objects/bet.object';

export const ALL_BETS_VIEW_UNIVERSAL_IDENTIFIER = 'c13767b9-c54a-4f7a-ac6a-5967f76c7a5a';

export default defineView({
  universalIdentifier: ALL_BETS_VIEW_UNIVERSAL_IDENTIFIER,
  name: 'All Bets',
  objectUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
  type: ViewType.TABLE,
  key: ViewKey.INDEX,
  icon: 'IconTrophy',
  fields: [
    {
      universalIdentifier: '3908cf12-6291-40e2-b2c2-3f4a271e13eb',
      fieldMetadataUniversalIdentifier: BET_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      position: 0,
      isVisible: true,
      size: 70,
    },
    {
      universalIdentifier: '65e4e556-dec6-4c3f-8be6-a80993311564',
      fieldMetadataUniversalIdentifier: PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
      position: 1,
      isVisible: true,
      size: 200,
    },
    {
      universalIdentifier: '1ea594d9-68b7-420a-a497-6f5e385a834c',
      fieldMetadataUniversalIdentifier: MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
      position: 2,
      isVisible: true,
      size: 260,
    },
    {
      universalIdentifier: '1504a3a1-5edf-44cc-95d5-21a90d2ee8b9',
      fieldMetadataUniversalIdentifier: BET_VALUE_FIELD_UNIVERSAL_IDENTIFIER,
      position: 3,
      isVisible: true,
    },
    {
      universalIdentifier: '3eeb97de-a7ed-4cbe-b04f-75befe69bcff',
      fieldMetadataUniversalIdentifier: BET_WON_FIELD_UNIVERSAL_IDENTIFIER,
      position: 4,
      isVisible: true,
    },
    {
      universalIdentifier: '55faaa16-1d0c-4d45-96b6-070fe6721b1d',
      fieldMetadataUniversalIdentifier: BET_PUNTEVS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 5,
      isVisible: true,
      size: 130,
    },
    {
      universalIdentifier: '8e4d2f6a-a947-4ebc-a1d6-85b656848fc0',
      fieldMetadataUniversalIdentifier: BET_PUNTOS_FIELD_UNIVERSAL_IDENTIFIER,
      position: 6,
      isVisible: true,
    },
  ],
});
