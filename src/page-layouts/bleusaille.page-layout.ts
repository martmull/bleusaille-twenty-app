import {
  AggregateOperations,
  definePageLayout,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { FINISHED_MATCHES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/finished-matches';
import { LIVE_MATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/live-match';
import { PODIUM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/podium';
import { SPACEX_PRICE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/spacex-price';
import { WINNER_BETS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/winner-bets';
import { MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/match-on-bet.field';
import { PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/person-on-bet.field';
import {
  BET_OBJECT_UNIVERSAL_IDENTIFIER,
  BET_PUNTEVS_FIELD_UNIVERSAL_IDENTIFIER,
  BET_PUNTOS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/objects/bet.object';
import { LEADERBOARD_PUNTEVS_VIEW_UNIVERSAL_IDENTIFIER } from 'src/views/leaderboard-puntevs.view';
import { LEADERBOARD_WCW_EV_VIEW_UNIVERSAL_IDENTIFIER } from 'src/views/leaderboard-wcw-ev.view';
import { LEADERBOARD_VIEW_UNIVERSAL_IDENTIFIER } from 'src/views/leaderboard.view';

export const BLEUSAILLE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  'a0463b53-6d88-4e0f-aa15-d0bea19b5a4c';

export default definePageLayout({
  universalIdentifier: BLEUSAILLE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Bleusaille',
  type: 'STANDALONE_PAGE',
  tabs: [
    {
      universalIdentifier: 'fc753665-d6d8-4592-b637-efbc6bbcf235',
      title: 'Leaderboard',
      position: 0,
      icon: 'IconTrophy',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: 'c731afca-6d74-4009-ad42-9778e8232f2d',
          title: 'Puntos evolution',
          type: 'GRAPH',
          objectUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 0,
            column: 0,
            rowSpan: 8,
            columnSpan: 8,
          },
          configuration: {
            configurationType: 'LINE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
              BET_PUNTOS_FIELD_UNIVERSAL_IDENTIFIER,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
              MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
            primaryAxisGroupBySubFieldName: 'startDate',
            primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.DAY,
            secondaryAxisGroupByFieldMetadataUniversalIdentifier:
              PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
            isCumulative: true,
            isStacked: false,
            displayDataLabel: false,
            displayLegend: false,
          },
        },
        {
          universalIdentifier: 'a9bcf5a3-6e39-4ef8-9144-e50c0877a267',
          title: 'Finished matches',
          type: 'FRONT_COMPONENT',
          gridPosition: {
            row: 0,
            column: 8,
            rowSpan: 15,
            columnSpan: 4,
          },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              FINISHED_MATCHES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
        {
          universalIdentifier: '6c488ea1-d025-40c0-9c90-15150e653d72',
          title: 'Leaderboard (puntos)',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
          gridPosition: {
            row: 8,
            column: 0,
            rowSpan: 11,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewId: LEADERBOARD_VIEW_UNIVERSAL_IDENTIFIER,
          },
        },
        {
          universalIdentifier: '8b6f1c4d-9a2e-4f30-bd71-2c5e0a4f9d83',
          title: 'Leaderboard (puntevs)',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
          STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
          gridPosition: {
            row: 8,
            column: 3,
            rowSpan: 11,
            columnSpan: 3,
          },
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewId: LEADERBOARD_PUNTEVS_VIEW_UNIVERSAL_IDENTIFIER,
          },
        },
        {
          universalIdentifier: '6dd1d37c-2893-45d7-b893-07095e378626',
          title: 'Leaderboard (+ wcw puntev)',
          type: 'RECORD_TABLE',
          objectUniversalIdentifier:
            STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
          gridPosition: {
            row: 8,
            column: 6,
            rowSpan: 11,
            columnSpan: 2,
          },
          configuration: {
            configurationType: 'RECORD_TABLE',
            viewId: LEADERBOARD_WCW_EV_VIEW_UNIVERSAL_IDENTIFIER,
          },
        },
        {
          universalIdentifier: 'd5db6c66-63dc-4ceb-828f-8fbe920a01a5',
          title: 'Puntevs evolution',
          type: 'GRAPH',
          objectUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
          gridPosition: {
            row: 21,
            column: 0,
            rowSpan: 8,
            columnSpan: 8,
          },
          configuration: {
            configurationType: 'LINE_CHART',
            aggregateFieldMetadataUniversalIdentifier:
            BET_PUNTEVS_FIELD_UNIVERSAL_IDENTIFIER,
            aggregateOperation: AggregateOperations.SUM,
            primaryAxisGroupByFieldMetadataUniversalIdentifier:
            MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
            primaryAxisGroupBySubFieldName: 'startDate',
            primaryAxisDateGranularity: ObjectRecordGroupByDateGranularity.DAY,
            secondaryAxisGroupByFieldMetadataUniversalIdentifier:
            PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER,
            isCumulative: true,
            isStacked: false,
            displayDataLabel: false,
            displayLegend: false,
          },
        },
        {
          universalIdentifier: '133e87e9-aed4-484e-acae-deee73996169',
          title: 'Podium',
          type: 'FRONT_COMPONENT',
          gridPosition: {
            row: 21,
            column: 8,
            rowSpan: 4,
            columnSpan: 4,
          },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
            PODIUM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
        {
          universalIdentifier: '327657bf-50f7-4cc6-9f9d-b2244d5d1102',
          title: 'POT',
          type: 'FRONT_COMPONENT',
          gridPosition: {
            row: 21,
            column: 8,
            rowSpan: 4,
            columnSpan: 4,
          },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              SPACEX_PRICE_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
        {
          universalIdentifier: '5c213c3c-a483-4310-80e5-5c472aa17968',
          title: 'Winner Bets',
          type: 'FRONT_COMPONENT',
          gridPosition: {
            row: 29,
            column: 0,
            rowSpan: 6,
            columnSpan: 8,
          },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
            WINNER_BETS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
    {
      universalIdentifier: '9e8e98e5-6e0a-4e39-b7f9-6ee1d9c14747',
      title: 'Live',
      position: 1,
      icon: 'IconLivePhoto',
      layoutMode: PageLayoutTabLayoutMode.GRID,
      widgets: [
        {
          universalIdentifier: '80b9b5ed-0ce5-4fca-b332-711aba23a26a',
          title: 'Live match',
          type: 'FRONT_COMPONENT',
          gridPosition: {
            row: 0,
            column: 0,
            rowSpan: 19,
            columnSpan: 9,
          },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              LIVE_MATCH_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
