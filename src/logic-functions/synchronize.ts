import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient } from 'src/logic-functions/shared/api';
import { fetchExternalData } from 'src/logic-functions/shared/external-data';
import { computePuntosEvolution } from 'src/logic-functions/shared/steps/compute-puntos-evolution.step';
import { computeBetsPuntos } from 'src/logic-functions/shared/steps/compute-puntos.step';
import { importBettors } from 'src/logic-functions/shared/steps/import-bettors.step';
import { settleBets } from 'src/logic-functions/shared/steps/settle-bets.step';
import { syncBets } from 'src/logic-functions/shared/steps/sync-bets.step';
import { syncMatches } from 'src/logic-functions/shared/steps/sync-matches.step';
import { updatePeoplePuntos } from 'src/logic-functions/shared/steps/update-people-puntos.step';
import { updateVictoryChance } from 'src/logic-functions/shared/steps/update-victory-chance.step';
import { updateWcWinnerBets } from 'src/logic-functions/shared/steps/update-wc-winner-bets.step';
import { updateWinnerBetPuntosEv } from 'src/logic-functions/shared/steps/update-winner-bet-puntos-ev.step';
import { updatePuntosWcwEv } from 'src/logic-functions/shared/steps/update-puntos-wcw-ev.step';
import { updateBetEv } from 'src/logic-functions/shared/steps/update-bet-ev.step';
import { updateMatchQuotes } from 'src/logic-functions/shared/steps/update-match-quotes.step';
import { updateMatchBreakeven } from 'src/logic-functions/shared/steps/update-match-breakeven.step';
import { updateWinnings } from 'src/logic-functions/shared/steps/update-winnings.step';

const handler = async () => {
  const client = createCoreApiClient();

  console.log('[synchronize] starting pipeline');

  console.log('[synchronize] fetching external data in parallel');
  const externalData = await fetchExternalData();
  console.log('[synchronize] external data fetched');

  console.log('[synchronize] step 1/15: importing bettors');
  const importBettorsResult = await importBettors(client, externalData.kicktippBets);
  console.log('[synchronize] import bettors done', importBettorsResult);

  console.log('[synchronize] step 2/15: syncing matches');
  const syncMatchesResult = await syncMatches(client, externalData.worldCupMatches);
  console.log('[synchronize] sync matches done', syncMatchesResult);

  console.log('[synchronize] step 3/15: syncing bets');
  const syncBetsResult = await syncBets(client, externalData.kicktippBets);
  console.log('[synchronize] sync bets done', syncBetsResult);

  console.log('[synchronize] step 4/15: settling bets');
  const settleBetsResult = await settleBets(client);
  console.log('[synchronize] settle bets done', settleBetsResult);

  console.log('[synchronize] step 5/15: computing puntos');
  const computePuntosResult = await computeBetsPuntos(client);
  console.log('[synchronize] compute puntos done', computePuntosResult);

  console.log('[synchronize] step 6/15: computing puntos evolution');
  const computePuntosEvolutionResult = await computePuntosEvolution(client);
  console.log('[synchronize] compute puntos evolution done', computePuntosEvolutionResult);

  console.log('[synchronize] step 7/15: updating people puntos');
  const updatePeoplePuntosResult = await updatePeoplePuntos(client);
  console.log('[synchronize] update people puntos done', updatePeoplePuntosResult);

  console.log('[synchronize] step 8/15: updating WC winner bets');
  const updateWcWinnerBetsResult = await updateWcWinnerBets(client, externalData.kicktippWcWinners);
  console.log('[synchronize] update WC winner bets done', updateWcWinnerBetsResult);

  console.log('[synchronize] step 9/15: updating victory chance');
  const updateVictoryChanceResult = await updateVictoryChance(
    client,
    externalData.worldCupWinnerChances,
  );
  console.log('[synchronize] update victory chance done', updateVictoryChanceResult);

  console.log('[synchronize] step 10/15: updating winner bet puntos ev');
  const updateWinnerBetPuntosEvResult = await updateWinnerBetPuntosEv(client);
  console.log('[synchronize] update winner bet puntos ev done', updateWinnerBetPuntosEvResult);

  console.log('[synchronize] step 11/15: updating puntos + wcw ev');
  const updatePuntosWcwEvResult = await updatePuntosWcwEv(client);
  console.log('[synchronize] update puntos + wcw ev done', updatePuntosWcwEvResult);

  console.log('[synchronize] step 12/15: updating winnings');
  const updateWinningsResult = await updateWinnings(client);
  console.log('[synchronize] update winnings done', updateWinningsResult);

  console.log('[synchronize] step 13/15: updating match quotes');
  const updateMatchQuotesResult = await updateMatchQuotes(client, externalData.matchResultChances);
  console.log('[synchronize] update match quotes done', updateMatchQuotesResult);

  console.log('[synchronize] step 14/15: updating match breakeven');
  const updateMatchBreakevenResult = await updateMatchBreakeven(client);
  console.log('[synchronize] update match breakeven done', updateMatchBreakevenResult);

  console.log('[synchronize] step 15/15: updating bet EV');
  const updateBetEvResult = await updateBetEv(client, externalData.matchResultChances);
  console.log('[synchronize] update bet EV done', updateBetEvResult);

  console.log('[synchronize] pipeline complete');

  return {
    importBettors: importBettorsResult,
    syncMatches: syncMatchesResult,
    syncBets: syncBetsResult,
    settleBets: settleBetsResult,
    computePuntos: computePuntosResult,
    computePuntosEvolution: computePuntosEvolutionResult,
    updatePeoplePuntos: updatePeoplePuntosResult,
    updateWcWinnerBets: updateWcWinnerBetsResult,
    updateVictoryChance: updateVictoryChanceResult,
    updateWinnerBetPuntosEv: updateWinnerBetPuntosEvResult,
    updatePuntosWcwEv: updatePuntosWcwEvResult,
    updateWinnings: updateWinningsResult,
    updateMatchQuotes: updateMatchQuotesResult,
    updateMatchBreakeven: updateMatchBreakevenResult,
    updateBetEv: updateBetEvResult,
  };
};

export default defineLogicFunction({
  universalIdentifier: 'f21599f0-1fad-427a-a5fe-4e1fd2a1be1a',
  name: 'synchronize',
  description:
    'Runs the full pipeline in order: import bettors, sync matches, sync bets, settle bets, then compute puntos.',
  timeoutSeconds: 600,
  handler,
  cronTriggerSettings: {
    pattern: '0 * * * *',
  },
  httpRouteTriggerSettings: {
    httpMethod: 'GET', isAuthRequired: false, path: '/synchronize-all'
  }
});
