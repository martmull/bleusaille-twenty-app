import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { BET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/bet.object';

export default defineNavigationMenuItem({
  universalIdentifier: '19e059d8-1380-4349-a32f-7f5a4cca4576',
  name: 'Bets',
  position: 2,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
});
