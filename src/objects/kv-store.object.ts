import { defineObject, FieldType } from 'twenty-sdk/define';

export const KV_STORE_UNIVERSAL_IDENTIFIER = '94b36c7d-a5ca-4a8d-9c23-6196c23260c2';
export const KV_STORE_KEY_FIELD_UNIVERSAL_IDENTIFIER = 'c1ec48fc-c996-4351-bccb-f929227e6d31';
export const KV_STORE_VALUE_FIELD_UNIVERSAL_IDENTIFIER = '78e418f5-cc3a-475e-b658-5835bfb94294';

export default defineObject({
  universalIdentifier: KV_STORE_UNIVERSAL_IDENTIFIER,
  nameSingular: 'kvStore',
  namePlural: 'kvStores',
  labelSingular: 'KV Store',
  labelPlural: 'KV Store',
  description: 'Key-value storage for logic functions (caching, cursors, shared state)',
  icon: 'IconDatabase',
  fields: [
    {
      universalIdentifier: KV_STORE_KEY_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'key',
      type: FieldType.TEXT,
      label: 'Key',
      description: 'Unique lookup key',
      icon: 'IconKey',
    },
    {
      universalIdentifier: KV_STORE_VALUE_FIELD_UNIVERSAL_IDENTIFIER,
      name: 'value',
      type: FieldType.RAW_JSON,
      label: 'Value',
      description: 'Stored JSON payload',
      icon: 'IconJson',
    },
  ],
});
