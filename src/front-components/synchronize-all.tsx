import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, enqueueSnackbar } from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';

export const SYNCHRONIZE_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '9bf81cfc-b75f-45f1-92f3-804ac5afe87a';

const SynchronizeAll = () => {
  const execute = async () => {
    try {
      const client = new RestApiClient();
      await client.get('/s/synchronize-all?full=true');
      await enqueueSnackbar({
        message: 'Data synchronized',
        variant: 'success',
      });
    } catch {
      await enqueueSnackbar({
        message: 'Synchronization failed',
        variant: 'error',
      });
    }
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: SYNCHRONIZE_ALL_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'synchronize-all',
  description: 'Headless component that triggers the /synchronize-all endpoint',
  component: SynchronizeAll,
  isHeadless: true,
});
