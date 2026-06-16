import { defineObject, FieldType } from 'twenty-sdk/define';

export const PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER =
  'aace6f88-67f0-4677-b9b6-478cc65b6476';

export const PUNTOS_EVOLUTION_NAME_FIELD_UNIVERSAL_IDENTIFIER =
  'a6a17cbe-21c8-4b12-b7a1-ee384da38c02';
export const PUNTOS_EVOLUTION_MATCH_END_DATE_FIELD_UNIVERSAL_IDENTIFIER =
  '769f1512-0b2b-43c6-8b9b-8cb15f534845';
export const PUNTOS_EVOLUTION_POINTS_FIELD_UNIVERSAL_IDENTIFIER =
  '80e1e00e-fe6b-45dc-a01b-e87d93130c4b';

export default defineObject({
  universalIdentifier: PUNTOS_EVOLUTION_OBJECT_UNIVERSAL_IDENTIFIER,
  nameSingular: 'puntosEvolution',
  namePlural: 'puntosEvolutions',
  labelSingular: 'Puntos Evolution',
  labelPlural: 'Puntos Evolutions',
  description:
    'A data point of a person cumulated puntos at a given match end date, used to plot the puntos evolution.',
  icon: 'IconChartLine',
  isSearchable: false,
  labelIdentifierFieldMetadataUniversalIdentifier:
    PUNTOS_EVOLUTION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
  fields: [
    {
      universalIdentifier: PUNTOS_EVOLUTION_NAME_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.TEXT,
      name: 'name',
      label: 'Name',
      description: 'Name',
      icon: 'IconAbc',
    },
    {
      universalIdentifier: PUNTOS_EVOLUTION_MATCH_END_DATE_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.DATE_TIME,
      name: 'matchEndDate',
      label: 'Match End Date',
      description: 'End date of the match this data point refers to',
      icon: 'IconCalendarEvent',
      isNullable: true,
      defaultValue: null,
    },
    {
      universalIdentifier: PUNTOS_EVOLUTION_POINTS_FIELD_UNIVERSAL_IDENTIFIER,
      type: FieldType.NUMBER,
      name: 'points',
      label: 'Points',
      description: 'Puntos earned for this match',
      icon: 'IconNumber',
      isNullable: true,
      defaultValue: null,
    },
  ],
});
