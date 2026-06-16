import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { BET_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/bet.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'ab4f3f8a-0430-4e8b-a97e-63575d277229',
  name: 'Bets',
  icon: 'IconTrophy',
  position: 1,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: BET_OBJECT_UNIVERSAL_IDENTIFIER,
});
