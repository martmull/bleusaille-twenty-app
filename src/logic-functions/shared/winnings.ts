import { round2 } from 'src/logic-functions/shared/api';

export const PRIZE_SHARE_BY_RANK = [0.5, 0.3, 0.2];

export type WinningsGroup = {
  puntos: number;
  personIds: string[];
};

/**
 * Splits the pot across the podium: 50% to 1st place, 30% to 2nd, 20% to 3rd.
 * Each rank's share is divided equally among the people tied at that place.
 * Returns the amount (€) each podium person cashes out, keyed by person id.
 * Edit PRIZE_SHARE_BY_RANK to tweak the payout structure.
 */
export const computeWinnings = (
  potValueEur: number,
  groups: WinningsGroup[],
): Map<string, number> => {
  const winnings = new Map<string, number>();

  groups.slice(0, PRIZE_SHARE_BY_RANK.length).forEach((group, index) => {
    if (group.personIds.length === 0) {
      return;
    }

    const perPerson = (potValueEur * PRIZE_SHARE_BY_RANK[index]) / group.personIds.length;
    const rounded = round2(perPerson);

    for (const personId of group.personIds) {
      winnings.set(personId, rounded);
    }
  });

  return winnings;
};
