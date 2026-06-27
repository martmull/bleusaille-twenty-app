import {
  defineViewField,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PUNTOS_WCW_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/puntos-wcw-ev-on-person.field';

// Append the puntos + wcw ev column to the standard "All People" index view
// rather than redefining the whole view, so the default columns are left untouched.
const ALL_PEOPLE_VIEW_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.views.allPeople.universalIdentifier;

export default defineViewField({
  universalIdentifier: '21d86740-7498-488e-a0d1-0441eddd7c2f',
  viewUniversalIdentifier: ALL_PEOPLE_VIEW_UNIVERSAL_IDENTIFIER,
  fieldMetadataUniversalIdentifier:
    PUNTOS_WCW_EV_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  position: 101,
  isVisible: true,
  size: 130,
});
