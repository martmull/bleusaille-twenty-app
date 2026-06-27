import { defineLogicFunction } from 'twenty-sdk/define';
import { generateBets, GeneratedBet } from "src/logic-functions/shared/generate-best-strategy-bets";
import { createCoreApiClient, fetchAllRecords } from "src/logic-functions/shared/api";

type MatchRecord = {
  id: string;
  name: string | null;
  startDate: string | null;
  prematchHomeCote: number | null;
  prematchDrawCote: number | null;
  prematchAwayCote: number | null;
};

type BettorRecord = {
  id: string;
  name: { firstName: string | null; lastName: string | null } | null;
  puntos: number | null;
};


const handler = async ({
                         bettorName = 'Martin',
                         n = 12
                       }: {
  bettorName?: string;
  n?: number;
}): Promise<GeneratedBet[]> => {


  const client = createCoreApiClient();

  const matches = await fetchAllRecords<MatchRecord>(client, 'matches', {
    id: true,
    name: true,
    startDate: true,
    prematchHomeCote: true,
    prematchDrawCote: true,
    prematchAwayCote: true,
  });

  const bettors = await fetchAllRecords<BettorRecord>(client, 'people', {
    id: true,
    name: { firstName: true, lastName: true },
    puntos: true,
  });

  const formattedBettors = bettors.map((bettor) => ({
    id: bettor.id,
    name: bettor.name?.firstName ?? '',
    points: bettor.puntos ?? 0,
  }));

  const now = Date.now();

  const nextMatches = matches
    .filter(
      (match) =>
        match.name &&
        match.startDate &&
        new Date(match.startDate).getTime() > now &&
        match.prematchHomeCote &&
        match.prematchDrawCote &&
        match.prematchAwayCote,
    )
    .sort((a, b) => new Date(a.startDate!).getTime() - new Date(b.startDate!).getTime())
    .slice(0, n);

  return nextMatches.map((match) =>
    generateBets({
      bettorName,
      match: {
        id: match.id,
        name: match.name!,
        prematchHomeCote: match.prematchHomeCote!,
        prematchDrawCote: match.prematchDrawCote!,
        prematchAwayCote: match.prematchAwayCote!,
      },
      bettors: formattedBettors,
    }),
  );

};

export default defineLogicFunction({
  universalIdentifier: '810e0976-f73b-4b9b-a8ca-85505938edf5',
  name: 'best-strategy-prediction',
  description: 'Add a description for your logic function',
  timeoutSeconds: 5,
  handler,
    // Add your trigger here
    // Route trigger example:
    // httpRouteTriggerSettings: {
    //   path: '/best-strategy-prediction',
    //   httpMethod: 'POST',
    //   isAuthRequired: true,
    // },
    // Cron trigger example:
    // cronTriggerSettings: {
    //   pattern: '0 0 * * *', // Daily at midnight
    // },
    // Database event trigger example:
    // databaseEventTriggerSettings: {
    //   eventName: 'objectName.created',
    // },
});
