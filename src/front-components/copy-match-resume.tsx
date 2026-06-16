import { defineFrontComponent } from 'twenty-sdk/define';
import {
  Command,
  copyToClipboard,
  enqueueSnackbar,
  useSelectedRecordIds,
} from 'twenty-sdk/front-component';
import { CoreApiClient } from 'twenty-client-sdk/core';

import {
  buildMatchResumeMessage,
  EvolutionRow,
  WinningBet,
} from 'src/front-components/shared/match-resume-message';

export const COPY_MATCH_RESUME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER =
  '95f06dfb-7a84-401e-8dfa-65d071b2ee76';

const PAGE_SIZE = 60;

type Connection<T> = {
  edges: { node: T }[];
  pageInfo: { hasNextPage: boolean; endCursor: string | null };
};

const fetchAllPages = async <T,>(
  fetchPage: (after: string | undefined) => Promise<Connection<T>>,
): Promise<T[]> => {
  const records: T[] = [];
  let after: string | undefined = undefined;

  while (true) {
    const connection = await fetchPage(after);
    records.push(...connection.edges.map((edge) => edge.node));

    if (!connection.pageInfo.hasNextPage || !connection.pageInfo.endCursor) {
      return records;
    }

    after = connection.pageInfo.endCursor;
  }
};

type BetNode = {
  puntos: number | null;
  match: { id: string | null } | null;
  person: { name: { firstName: string | null } | null } | null;
};

type EvolutionNode = {
  points: number | null;
  matchEndDate: string | null;
  person: { id: string; name: { firstName: string | null } | null } | null;
};

const CopyMatchResume = () => {
  const selectedRecordIds = useSelectedRecordIds();

  const execute = async () => {
    try {
      if (selectedRecordIds.length !== 1) {
        await enqueueSnackbar({ message: 'Sélectionnez un seul match', variant: 'error' });
        return;
      }

      const matchId = selectedRecordIds[0];
      const client = new CoreApiClient();

      const { matches } = await client.query({
        matches: {
          __args: { first: 1, filter: { id: { eq: matchId } } },
          edges: { node: { home: true, away: true, score: true, endDate: true } },
          pageInfo: { hasNextPage: true, endCursor: true },
        },
      });

      const matchNode = matches.edges[0]?.node;
      if (!matchNode) {
        await enqueueSnackbar({ message: 'Match introuvable', variant: 'error' });
        return;
      }

      const bets = await fetchAllPages<BetNode>(async (after) => {
        const { bets: page } = await client.query({
          bets: {
            __args: { first: PAGE_SIZE, after, filter: { won: { eq: true } } },
            edges: {
              node: {
                puntos: true,
                match: { id: true },
                person: { name: { firstName: true } },
              },
            },
            pageInfo: { hasNextPage: true, endCursor: true },
          },
        });
        return page;
      });

      const evolutionNodes = await fetchAllPages<EvolutionNode>(async (after) => {
        const { puntosEvolutions: page } = await client.query({
          puntosEvolutions: {
            __args: { first: PAGE_SIZE, after },
            edges: {
              node: {
                points: true,
                matchEndDate: true,
                person: { id: true, name: { firstName: true } },
              },
            },
            pageInfo: { hasNextPage: true, endCursor: true },
          },
        });
        return page;
      });

      const winners: WinningBet[] = bets
        .filter((bet) => bet.match?.id === matchId && bet.person?.name?.firstName)
        .map((bet) => ({
          firstName: bet.person!.name!.firstName as string,
          puntos: bet.puntos ?? 0,
        }));

      const evolutions: EvolutionRow[] = evolutionNodes
        .filter((row) => row.person?.id && row.person.name?.firstName)
        .map((row) => ({
          personId: row.person!.id,
          firstName: row.person!.name!.firstName as string,
          points: row.points ?? 0,
          matchEndDate: row.matchEndDate,
        }));

      const message = buildMatchResumeMessage({
        match: {
          home: matchNode.home ?? '',
          away: matchNode.away ?? '',
          score: matchNode.score ?? '',
        },
        matchEndDate: matchNode.endDate ?? null,
        winners,
        evolutions,
      });

      await copyToClipboard(message);
      await enqueueSnackbar({
        message: 'Résumé copié dans le presse-papiers',
        variant: 'success',
      });
    } catch {
      await enqueueSnackbar({ message: 'Échec de la copie du résumé', variant: 'error' });
    }
  };

  return <Command execute={execute} />;
};

export default defineFrontComponent({
  universalIdentifier: COPY_MATCH_RESUME_FRONT_COMPONENT_UNIVERSAL_IDENTIFIER,
  name: 'copy-match-resume',
  description: 'Headless component that copies the selected match résumé to the clipboard',
  component: CopyMatchResume,
  isHeadless: true,
});
