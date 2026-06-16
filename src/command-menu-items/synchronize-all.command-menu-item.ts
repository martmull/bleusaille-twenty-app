import { defineCommandMenuItem } from 'twenty-sdk/define';

import { SYNCHRONIZE_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/synchronize-all';

export default defineCommandMenuItem({
  universalIdentifier: '366d0fbf-36d4-49b6-b957-a787fca9e139',
  label: 'Synchronize all',
  shortLabel: 'Sync all',
  icon: 'IconRefresh',
  isPinned: true,
  availabilityType: 'GLOBAL',
  frontComponentUniversalIdentifier: SYNCHRONIZE_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
