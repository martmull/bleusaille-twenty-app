import { defineCommandMenuItem, STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS } from 'twenty-sdk/define';

import { IMPORT_BETTORS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/import-bettors';
import { BET_OBJECT_UNIVERSAL_IDENTIFIER } from "src/objects/bet.object";

export default defineCommandMenuItem({
  universalIdentifier: '9592bc07-6334-4601-ac5c-85520ea4e6b9',
  label: 'Import bettors',
  shortLabel: 'Import bettors',
  icon: 'IconUserPlus',
  isPinned: true,
availabilityObjectUniversalIdentifier: STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.universalIdentifier,
  frontComponentUniversalIdentifier: IMPORT_BETTORS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
