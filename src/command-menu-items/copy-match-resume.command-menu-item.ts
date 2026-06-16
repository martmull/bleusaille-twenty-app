import {
  defineCommandMenuItem,
  everyDefined,
  numberOfSelectedRecords,
  objectMetadataItem,
  selectedRecords,
} from 'twenty-sdk/define';

import { COPY_MATCH_RESUME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER } from 'src/front-components/copy-match-resume';

export default defineCommandMenuItem({
  universalIdentifier: 'a7e61dae-05c1-4a50-bb0a-86aa42d8fca0',
  label: 'Copy match résumé',
  shortLabel: 'Copy résumé',
  icon: 'IconClipboard',
  isPinned: true,
  availabilityType: 'RECORD_SELECTION',
  conditionalAvailabilityExpression:
    objectMetadataItem.nameSingular === 'match' &&
    numberOfSelectedRecords === 1 &&
    everyDefined(selectedRecords, 'result'),
  frontComponentUniversalIdentifier: COPY_MATCH_RESUME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
});
