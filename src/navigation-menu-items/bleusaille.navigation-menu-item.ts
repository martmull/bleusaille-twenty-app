import { defineNavigationMenuItem, NavigationMenuItemType } from 'twenty-sdk/define';

import { BLEUSAILLE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER } from 'src/page-layouts/bleusaille.page-layout';

export default defineNavigationMenuItem({
  universalIdentifier: '4b0ad6fc-d790-4a94-868f-9046c6727ae9',
  name: 'Bleusaille',
  icon: 'IconLayoutDashboard',
  position: 2,
  type: NavigationMenuItemType.PAGE_LAYOUT,
  pageLayoutUniversalIdentifier: BLEUSAILLE_PAGE_LAYOUT_UNIVERSAL_IDENTIFIER,
});
