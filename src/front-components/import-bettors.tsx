import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, enqueueSnackbar } from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';

export const IMPORT_BETTORS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '21c808c9-8ce1-4bbb-89a6-8911e8cff5c2';

const ImportBettors = () => {
  const execute = async () => {
    try {
      const client = new RestApiClient();
      await client.get('/s/import-bettors');
      await enqueueSnackbar({
        message: 'Bettors imported',
        variant: 'success',
      });
    } catch {
      await enqueueSnackbar({
        message: 'Bettors import failed',
        variant: 'error',
      });
    }
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: IMPORT_BETTORS_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'import-bettors',
  description: 'Headless component that triggers the /import-bettors endpoint',
  component: ImportBettors,
  isHeadless: true,
});
