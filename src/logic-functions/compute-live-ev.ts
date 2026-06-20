import { defineLogicFunction } from 'twenty-sdk/define';

import { createCoreApiClient, fetchAllPages, PAGE_SIZE } from 'src/logic-functions/shared/api';
import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';
import { computeEv } from 'src/logic-functions/shared/steps/compute-ev.step';
import { FootballDataMatch } from 'src/logic-functions/shared/steps/sync-matches.step';
import { runSynchronize } from 'src/logic-functions/synchronize';

type MatchRecord = {
  name: string;
  startDate: string | null;
  endDate: string | null;
  result: string | null;
};

const handler = async () => {
  const client = createCoreApiClient();

  const matches = await fetchAllPages<MatchRecord>(async (after) => {
    const { matches: page } = await client.query({
      matches: {
        __args: { first: PAGE_SIZE, after },
        edges: { node: { name: true, startDate: true, endDate: true, result: true } },
        pageInfo: { hasNextPage: true, endCursor: true },
      },
    });
    return page;
  });

  const now = Date.now();
  const inProgressMatches = matches.filter(
    (match) =>
      !match.result &&
      match.startDate !== null &&
      new Date(match.startDate).getTime() <= now &&
      (match.endDate === null || new Date(match.endDate).getTime() >= now),
  );

  if (inProgressMatches.length === 0) {
    console.log('[compute-live-ev] no match in progress, skipping');
    return { skipped: true };
  }

  const apiMatches = await fetchWorldCupMatches<FootballDataMatch>();
  const finishedMatchNames = new Set(
    apiMatches
      .filter((match) => match.status === 'FINISHED' && match.homeTeam.name && match.awayTeam.name)
      .map((match) => `${match.homeTeam.name} vs ${match.awayTeam.name}`),
  );

  const hasJustTerminatedMatch = inProgressMatches.some((match) =>
    finishedMatchNames.has(match.name),
  );

  if (hasJustTerminatedMatch) {
    console.log('[compute-live-ev] match just terminated, running full sync');
    const result = await runSynchronize(client);
    return { skipped: false, terminated: true, ...result };
  }

  console.log('[compute-live-ev] match in progress, computing EV');
  const result = await computeEv(client);

  return { skipped: false, ...result };
};

export default defineLogicFunction({
  universalIdentifier: '7bf50d4c-3ead-4388-87ae-97246a7a819c',
  name: 'compute-live-ev',
  description:
    'Every minute, recomputes match quotes and bet EV while a match is in progress, and runs a full sync the moment a match terminates.',
  timeoutSeconds: 600,
  handler,
  cronTriggerSettings: {
    pattern: '* * * * *',
  },
});
