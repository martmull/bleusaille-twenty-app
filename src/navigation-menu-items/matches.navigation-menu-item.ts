import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { MATCH_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/match.object';

export default defineNavigationMenuItem({
  universalIdentifier: '6e7810a7-cd3e-44c3-bef1-1479a5d7f883',
  name: 'Matches',
  position: 1,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: MATCH_OBJECT_UNIVERSAL_IDENTIFIER,
});
