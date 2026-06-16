import { defineObject, FieldType } from 'twenty-sdk/define';

export const BET_OBJECT_UNIVERSAL_IDENTIFIER = '83564995-6acb-4080-a180-fffa1c7519fd';

export const BET_NAME_FIELD_UNIVERSAL_IDENTIFIER = 'abe622ef-f5b4-446c-bd15-3b058fd09a34';
export const BET_VALUE_FIELD_UNIVERSAL_IDENTIFIER = 'b417c819-2b22-4072-bb65-be8221a5eb9b';
export const BET_WON_FIELD_UNIVERSAL_IDENTIFIER = '48318c3c-2812-4c7c-943f-7f2480867f45';
export const BET_PUNTOS_FIELD_UNIVERSAL_IDENTIFIER = 'd367dbc6-34cb-4c30-815f-39f6fe91ae2e';
export const BET_EV_FIELD_UNIVERSAL_IDENTIFIER = '422b713b-0ab5-4341-82e3-5fc9d031b4de';

export enum BetValue {
  HOME_WIN = 'HOME_WIN',
  NULL_OR_DRAW = 'NULL_OR_DRAW',
  AWAY_WIN = 'AWAY_WIN',
}

export default defineObject({
  universalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'bet',
  namePlural: 'bets',
  labelSingular: 'Bet',
  labelPlural: 'Bets',
  description: "A person's prediction for a match. Each person should have at most one bet per match.",
  icon: 'IconTrophy',
  isSearchable: true,
  labelIdentifierFieldMetadataUniversalIdentifier: BET_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: BET_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      description: 'Name',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: BET_VALUE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.SELECT,
      name: 'betValue',
      label: 'Bet Value',
      description: 'Bet prediction: 1 = home win, 0 = draw/null, 2 = away win',
      icon: 'IconTrophy',
      isNullable: false,
      options: [
        {
          id: '0a76a6ea-c9fa-464d-9a39-76681a3035be',
          value: BetValue.HOME_WIN,
          label: '1',
          position: 0,
          color: 'green',
        },
        {
          id: '7078eaae-cb34-4b07-b0a2-26aba6eb54d1',
          value: BetValue.NULL_OR_DRAW,
          label: '0',
          position: 1,
          color: 'gray',
        },
        {
          id: 'fbe30b6e-43f0-4c1c-a1ce-9b2f74090f48',
          value: BetValue.AWAY_WIN,
          label: '2',
          position: 2,
          color: 'red',
        },
      ],
    },
    {
      universalIdentifier: BET_WON_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.BOOLEAN,
      name: 'won',
      label: 'Won',
      description: 'Whether the bet prediction matches the match result',
      icon: 'IconCheck',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: BET_PUNTOS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'puntos',
      label: 'Puntos',
      description: 'Points won for this bet',
      icon: 'IconNumber',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: BET_EV_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'ev',
      label: 'EV (puntos)',
      description:
        'Expected puntos for this bet, from live match odds weighted by the pot shared across winners',
      icon: 'IconChartLine',
      isNullable: true,
      defaultValue: null,
    },
  ],
});
