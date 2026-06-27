import {
  defineViewField,
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS,
} from 'twenty-sdk/define';

import { PUNTEVS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER } from 'src/fields/puntevs-on-person.field';

// Append the puntevs column to the standard "All People" index view rather than
// redefining the whole view, so the default columns are left untouched.
export const ALL_PEOPLE_VIEW_UNIVERSAL_IDENTIFIER =
  STANDARD_OBJECT_UNIVERSAL_IDENTIFIERS.person.views.allPeople.universalIdentifier;

export default defineViewField({
  universalIdentifier: '3d7efc36-e7f0-4268-82c9-5b8079649c20',
  viewUniversalIdentifier: ALL_PEOPLE_VIEW_UNIVERSAL_IDENTIFIER,
  fieldMetadataUniversalIdentifier: PUNTEVS_ON_PERSON_FIELD_UNIVERSAL_IDENTIFIER,
  position: 100,
  isVisible: true,
  size: 130,
});
