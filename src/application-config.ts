import { defineApplication } from 'twenty-sdk/define';

import {
  APP_DESCRIPTION,
  APP_DISPLAY_NAME,
  APPLICATION_UNIVERSAL_IDENTIFIER,
} from 'src/constants/universal-identifiers';

export default defineApplication({
  universalIdentifier: APPLICATION_UNIVERSAL_IDENTIFIER,
  displayName: APP_DISPLAY_NAME,
  description: APP_DESCRIPTION,
  applicationVariables: {
    FOOTBALL_DATA_API_TOKEN: {
      universalIdentifier: '8e8090d7-71ee-47a4-ae28-3d71cac72d04',
      description: '',
      isSecret: true,
    },
    KICKTIPP_EMAIL: {
      universalIdentifier: '8ac74fcb-5b47-4f55-987e-f837a59d6473',
      description: '',
      value: 'cause-81classement@icloud.com',
    },
    KICKTIPP_PASSWORD: {
      universalIdentifier: '3832badf-6e77-473e-a4cb-0621828d8cdc',
      description: '',
      isSecret: true,
    },
    ODDS_API_KEY: {
      universalIdentifier: 'c1a3259b-d53d-420f-ac3c-fb25ced56a8e',
      description: '',
      isSecret: true,
    },
    RESEND_API_KEY: {
      universalIdentifier: '49bd5b2b-2012-437c-97b4-04176da27da4',
      description: 'Resend API key used to send admin notification emails.',
      isSecret: true,
    },
    ADMIN_EMAIL: {
      universalIdentifier: 'c6014fbb-fe33-48dd-8a1f-6dcbbc594136',
      description: 'Recipient address for admin notification emails (e.g. odds API key updates).',
    },
  }
});
