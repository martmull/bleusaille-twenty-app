import { defineCommandMenuItem, objectMetadataItem } from 'twenty-sdk/define';


import { COMPUTE_EV_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/compute-ev';

export default defineCommandMenuItem({
  universalIdentifier: '94177851-11bb-4bdd-8731-0ca754cd1794',
  label: 'Compute EV',
  shortLabel: 'Compute EV',
  icon: 'IconChartLine',
  isPinned: true,
  availabilityType: 'GLOBAL',
  conditionalAvailabilityExpression:
    objectMetadataItem.nameSingular === 'match' || objectMetadataItem.nameSingular === 'bet' || objectMetadataItem.nameSingular === 'dashboard',
  frontComponentUniversalIdentifier: COMPUTE_EV_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
