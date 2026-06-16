import { defineFrontComponent } from 'twenty-sdk/define';
import { Command, enqueueSnackbar } from 'twenty-sdk/front-component';
import { RestApiClient } from 'twenty-client-sdk/rest';

export const COMPUTE_EV_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '95f621a4-4e6c-492d-bb46-588df7a78c21';

const ComputeEv = () => {
  const execute = async () => {
    try {
      const client = new RestApiClient();
      await client.get('/s/compute-ev');
      await enqueueSnackbar({
        message: 'EV updated with fresh quotes',
        variant: 'success',
      });
    } catch {
      await enqueueSnackbar({
        message: 'EV computation failed',
        variant: 'error',
      });
    }
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: COMPUTE_EV_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'compute-ev',
  description: 'Headless component that triggers the /compute-ev endpoint',
  component: ComputeEv,
  isHeadless: true,
});
