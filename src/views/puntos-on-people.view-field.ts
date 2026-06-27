import {
  defineViewField,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PUNTOS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/puntos-on-person.field';

// Append the puntos column to the standard "All People" index view rather than
// redefining the whole view, so the default columns are left untouched.
const ALL_PEOPLE_VIEW_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.views.allPeople.universalIdentifier;

export default defineViewField({
  universalIdentifier: '0ca4618e-c5eb-43d1-b317-11dd39be21dd',
  viewUniversalIdentifier: ALL_PEOPLE_VIEW_UNIVERSAL_IDENTIFIER,
  fieldMetadataUniversalIdentifier: PUNTOS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  position: 99,
  isVisible: true,
  size: 130,
});
