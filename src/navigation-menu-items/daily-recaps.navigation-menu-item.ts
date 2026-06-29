import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER } from 'src/objects/daily-recap.object';

export default defineNavigationMenuItem({
  universalIdentifier: 'ebf39271-01f8-431f-ab30-b4e787216bd6',
  name: 'Daily Recaps',
  position: 3,
  type: NavigationMenuItemType.OBJECT,
  targetObjectUniversalIdentifier: DAILY_RECAP_OBJECT_UNIVERSAL_IDENTIFIER,
});
