import { defineLogicFunction } from 'twenty-sdk/define';

import {
  applyGroupedUpdates,
  createCoreApiClient,
  fetchAllPages,
  PAGE_SIZE,
} from 'src/logic-functions/shared/api';
import { fetchWorldCupMatches } from 'src/logic-functions/shared/football-data';
import { computeEv } from 'src/logic-functions/shared/steps/compute-ev.step';
import { FootballDataMatch } from 'src/logic-functions/shared/steps/sync-matches.step';
import { runSynchronize } from 'src/logic-functions/synchronize';

type MatchRecord = {
  id: string;
  name: string;
  score: string | null;
  startDate: string | null;
  endDate: string | null;
  result: string | null;
};

const toLiveScore = (match: FootballDataMatch): string =>
  `${match.score.fullTime.home ?? 0}-${match.score.fullTime.away ?? 0}`;

const handler = async () => {
  const client = createCoreApiClient();

  const matches = await fetchAllPages<MatchRecord>(async (after) => {
    const { matches: page } = await client.query({
      matches: {
        __args: { first: PAGE_SIZE, after },
        edges: {
          node: { id: true, name: true, score: true, startDate: true, endDate: true, result: true },
        },
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
  const apiMatchesByName = new Map<string, FootballDataMatch>(
    apiMatches
      .filter((match) => match.homeTeam.name && match.awayTeam.name)
      .map((match) => [`${match.homeTeam.name} vs ${match.awayTeam.name}`, match]),
  );

  const hasJustTerminatedMatch = inProgressMatches.some(
    (match) => apiMatchesByName.get(match.name)?.status === 'FINISHED',
  );

  if (hasJustTerminatedMatch) {
    console.log('[compute-live-ev] match just terminated, running full sync');
    const result = await runSynchronize(client);
    return { skipped: false, terminated: true, ...result };
  }

  const scoreUpdates: Array<{ id: string; liveScore: string }> = [];
  for (const match of inProgressMatches) {
    const apiMatch = apiMatchesByName.get(match.name);

    if (!apiMatch) {
      continue;
    }

    const liveScore = toLiveScore(apiMatch);

    if ((match.score ?? '') !== liveScore) {
      scoreUpdates.push({ id: match.id, liveScore });
    }
  }

  if (scoreUpdates.length === 0) {
    console.log('[compute-live-ev] no score change, skipping');
    return { skipped: true };
  }

  await applyGroupedUpdates(
    scoreUpdates.map(({ id, liveScore }) => ({ id, data: { score: liveScore } })),
    (ids, data) =>
      client.mutation({
        updateMatches: { __args: { data, filter: { id: { in: ids } } }, id: true },
      }),
  );

  console.log('[compute-live-ev] score changed, computing EV');
  const result = await computeEv(client);

  return { skipped: false, scoreChanged: true, ...result };
};

export default defineLogicFunction({
  universalIdentifier: '7bf50d4c-3ead-4388-87ae-97246a7a819c',
  name: 'compute-live-ev',
  description:
    'Every minute while a match is in progress, recomputes match quotes and bet EV when the live score changes, and runs a full sync the moment a match terminates.',
  timeoutSeconds: 600,
  handler,
  cronTriggerSettings: {
    pattern: '* * * * *',
  },
});
