import { defineLogicFunction, RoutePayload } from 'twenty-sdk/define';
import { CoreApiClient } from 'twenty-client-sdk/core';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { fetchExternalDataSettled } from 'src/logic-functions/shared/external-data';
import { computePuntosEvolution } from 'src/logic-functions/shared/steps/compute-puntos-evolution.step';
import { computeBetsPuntos } from 'src/logic-functions/shared/steps/compute-puntos.step';
import { settleBets } from 'src/logic-functions/shared/steps/settle-bets.step';
import { syncBets } from 'src/logic-functions/shared/steps/sync-bets.step';
import { syncMatches } from 'src/logic-functions/shared/steps/sync-matches.step';
import { updatePeoplePuntos } from 'src/logic-functions/shared/steps/update-people-puntos.step';
import { updateVictoryChance } from 'src/logic-functions/shared/steps/update-victory-chance.step';
import { updateWcWinnerBets } from 'src/logic-functions/shared/steps/update-wc-winner-bets.step';
import { updateWinnerBetPuntosEv } from 'src/logic-functions/shared/steps/update-winner-bet-puntos-ev.step';
import { updatePuntosWcwEv } from 'src/logic-functions/shared/steps/update-puntos-wcw-ev.step';
import { updateMatchQuotes } from 'src/logic-functions/shared/steps/update-match-quotes.step';
import { updateMatchBreakeven } from 'src/logic-functions/shared/steps/update-match-breakeven.step';
import { updateWinnings } from 'src/logic-functions/shared/steps/update-winnings.step';

type StepStatus = 'success' | 'failed' | 'skipped';

type StepOutcome = {
  status: StepStatus;
  result?: unknown;
  error?: string;
  blockedBy?: string[];
};

type PipelineStep = {
  key: string;
  deps: string[];
  run: () => Promise<unknown>;
};

export type SynchronizeOptions = {
  refreshWinnerOdds?: boolean;
  matchOddsScope?: 'upcoming' | 'all';
};

export const runSynchronize = async (
  client: CoreApiClient = createCoreApiClient(),
  options: SynchronizeOptions = {},
) => {
  const refreshWinnerOdds = options.refreshWinnerOdds ?? false;
  const matchOddsScope = options.matchOddsScope ?? 'upcoming';
  console.log('[synchronize] starting pipeline', { refreshWinnerOdds, matchOddsScope });

  console.log('[synchronize] fetching external data in parallel');
  const { data: externalData, failed: failedExternal } = await fetchExternalDataSettled({
    ignore: ['worldCupWinnerChances', 'matchResultChances'],
  });
  if (failedExternal.length > 0) {
    console.error('[synchronize] external data fetch failed for', failedExternal);
  }
  console.log('[synchronize] external data fetched');

  const steps: PipelineStep[] = [
    {
      key: 'syncMatches',
      deps: ['worldCupMatches'],
      run: () => syncMatches(client, externalData.worldCupMatches),
    },
    {
      key: 'syncBets',
      deps: ['kicktippBets'],
      run: () => syncBets(client, externalData.kicktippBets),
    },
    {
      key: 'settleBets',
      deps: ['syncMatches', 'syncBets'],
      run: () => settleBets(client),
    },
    {
      key: 'computePuntos',
      deps: ['settleBets'],
      run: () => computeBetsPuntos(client),
    },
    {
      key: 'computePuntosEvolution',
      deps: ['computePuntos'],
      run: () => computePuntosEvolution(client),
    },
    {
      key: 'updatePeoplePuntos',
      deps: ['computePuntosEvolution', 'computePuntos'],
      run: () => updatePeoplePuntos(client),
    },
    {
      key: 'updateWcWinnerBets',
      deps: ['kicktippWcWinners'],
      run: () => updateWcWinnerBets(client, externalData.kicktippWcWinners),
    },
    {
      key: 'updateVictoryChance',
      deps: ['updateWcWinnerBets'],
      run: () => updateVictoryChance(client, undefined, { refresh: refreshWinnerOdds }),
    },
    {
      key: 'updateWinnerBetPuntosEv',
      deps: ['updateVictoryChance'],
      run: () => updateWinnerBetPuntosEv(client),
    },
    {
      key: 'updatePuntosWcwEv',
      deps: ['updatePeoplePuntos', 'updateWinnerBetPuntosEv'],
      run: () => updatePuntosWcwEv(client),
    },
    {
      key: 'updateWinnings',
      deps: ['updatePeoplePuntos'],
      run: () => updateWinnings(client),
    },
    {
      key: 'updateMatchQuotes',
      deps: ['syncMatches'],
      run: () => updateMatchQuotes(client, undefined, undefined, matchOddsScope),
    },
    {
      key: 'updateMatchBreakeven',
      deps: ['updateMatchQuotes'],
      run: () => updateMatchBreakeven(client),
    },
  ];

  const outcomes: Record<string, StepOutcome> = {};
  const failed = new Set<string>(failedExternal);

  for (const [index, step] of steps.entries()) {
    const blockedBy = step.deps.filter((dep) => failed.has(dep));

    if (blockedBy.length > 0) {
      failed.add(step.key);
      outcomes[step.key] = { status: 'skipped', blockedBy };
      console.warn(
        `[synchronize] step ${index + 1}/${steps.length}: skipping ${step.key}, blocked by`,
        blockedBy,
      );
      continue;
    }

    console.log(`[synchronize] step ${index + 1}/${steps.length}: running ${step.key}`);
    try {
      const result = await step.run();
      outcomes[step.key] = { status: 'success', result };
      console.log(`[synchronize] ${step.key} done`, result);
    } catch (error) {
      failed.add(step.key);
      outcomes[step.key] = {
        status: 'failed',
        error: error instanceof Error ? error.message : String(error),
      };
      console.error(`[synchronize] ${step.key} failed`, error);
    }
  }

  const failedSteps = steps
    .map((step) => step.key)
    .filter((key) => outcomes[key]?.status === 'failed');
  const skippedSteps = steps
    .map((step) => step.key)
    .filter((key) => outcomes[key]?.status === 'skipped');

  console.log('[synchronize] pipeline complete', {
    failedExternal,
    failedSteps,
    skippedSteps,
  });

  return outcomes;
};

const handler = async (event?: RoutePayload) => {
  const full = event?.queryStringParameters?.full === 'true';
  return runSynchronize(createCoreApiClient(), full ? { refreshWinnerOdds: true, matchOddsScope: 'all' } : {});
};

export default defineLogicFunction({
  universalIdentifier: 'f21599f0-1fad-427a-a5fe-4e1fd2a1be1a',
  name: 'synchronize',
  description:
    'Runs the full pipeline in order: sync matches, sync bets, settle bets, then compute puntos.',
  timeoutSeconds: 600,
  handler,
  cronTriggerSettings: {
    pattern: '0 * * * *',
  },
  httpRouteTriggerSettings: {
    httpMethod: 'GET', isAuthRequired: false, path: '/synchronize-all'
  }
});
