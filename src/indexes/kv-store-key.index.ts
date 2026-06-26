import { defineIndex } from 'twenty-sdk/define';

import {
  KV_STORE_KEY_FIELD_UNIVERSAL_IDENTIFIER,
  KV_STORE_UNIVERSAL_IDENTIFIER,
} from 'src/objects/kv-store.object';

export default defineIndex({
  universalIdentifier: '5299562f-9f3b-4f40-ae8c-26947c8fbc14',
  objectUniversalIdentifier: KV_STORE_UNIVERSAL_IDENTIFIER,
  isUnique: true,
  fields: [
    {
      universalIdentifier: 'eab822ce-c603-48a3-962b-e9956c2c4cb8',
      fieldUniversalIdentifier: KV_STORE_KEY_FIELD_UNIVERSAL_IDENTIFIER,
    },
  ],
});
