import {
  AggregateOperations,
  definePageLayout,
  ObjectRecordGroupByDateGranularity,
  PageLayoutTabLayoutMode,
} from 'twenty-sdk/define';

import { FINISHED_MATCHES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/finished-matches';
import { PODIUM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/podium';
import { MATCH_ON_BET_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/match-on-bet.field';
import { PERSON_ON_BET_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/person-on-bet.field';
import {
  BET_OBJECT_UNIVERSAL_IDENTIFIER,
  BET_PUNTOS_FIELD_UNIVERSAL_IDENTIFIER,
} from 'src/objects/bet.object';

export const BLEUSAILLE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER =
  'a0463b53-6d88-4e0f-aa15-d0bea19b5a4c';

export default definePageLayout({
  universalIdentifier: BLEUSAILLE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
  name: 'Bleusaille',
  type: 'STANDALONE_PAGE',
  defaultTabToFocusOnMobileAndSidePanelUniversalIdentifier: 'fc753665-d6d8-4592-b637-efbc6bbcf235',
  tabs: [
    {
      universalIdentifier: 'fc753665-d6d8-4592-b637-efbc6bbcf235',
      title: 'Leaderboard',
      position: 0,
      icon: 'IconLayoutDashboard',
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
            columnSpan: 7,
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
          universalIdentifier: '133e87e9-aed4-484e-acae-deee73996169',
          title: 'Podium',
          type: 'FRONT_COMPONENT',
          gridPosition: {
            row: 0,
            column: 7,
            rowSpan: 4,
            columnSpan: 5,
          },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              PODIUM_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
        {
          universalIdentifier: 'a9bcf5a3-6e39-4ef8-9144-e50c0877a267',
          title: 'Finished matches',
          type: 'FRONT_COMPONENT',
          gridPosition: {
            row: 4,
            column: 7,
            rowSpan: 17,
            columnSpan: 5,
          },
          configuration: {
            configurationType: 'FRONT_COMPONENT',
            frontComponentUniversalIdentifier:
              FINISHED_MATCHES_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
          },
        },
      ],
    },
  ],
});
