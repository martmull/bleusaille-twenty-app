import { describe, expect, it } from 'vitest';

import {
  buildKicktippTipFields,
  KicktippFormMatch,
  parseTippabgabeMatches,
} from 'src/logic-functions/shared/kicktipp';
import { BetValue } from 'src/objects/bet.object';

const formMatches: KicktippFormMatch[] = [
  {
    home: 'France',
    away: 'Brazil',
    heimField: 'spieltippForms[111].heimTipp',
    gastField: 'spieltippForms[111].gastTipp',
  },
  {
    home: 'Spain',
    away: 'Germany',
    heimField: 'spieltippForms[222].heimTipp',
    gastField: 'spieltippForms[222].gastTipp',
  },
];

describe('buildKicktippTipFields', () => {
  it('maps HOME_WIN to 1:0 when orientation matches', () => {
    const { matched } = buildKicktippTipFields(formMatches, [
      { home: 'France', away: 'Brazil', betValue: BetValue.HOME_WIN },
    ]);

    expect(matched).toHaveLength(1);
    expect(matched[0]).toMatchObject({
      heimField: 'spieltippForms[111].heimTipp',
      gastField: 'spieltippForms[111].gastTipp',
      heimTipp: 1,
      gastTipp: 0,
    });
  });

  it('maps NULL_OR_DRAW to 1:1', () => {
    const { matched } = buildKicktippTipFields(formMatches, [
      { home: 'Spain', away: 'Germany', betValue: BetValue.NULL_OR_DRAW },
    ]);

    expect(matched[0]).toMatchObject({ heimTipp: 1, gastTipp: 1 });
  });

  it('flips the score when the prediction orientation is reversed', () => {
    const { matched } = buildKicktippTipFields(formMatches, [
      { home: 'Brazil', away: 'France', betValue: BetValue.HOME_WIN },
    ]);

    expect(matched[0]).toMatchObject({
      heimField: 'spieltippForms[111].heimTipp',
      heimTipp: 0,
      gastTipp: 1,
    });
  });

  it('reports predictions with no matching form match as unmatched', () => {
    const { matched, unmatched } = buildKicktippTipFields(formMatches, [
      { home: 'Italy', away: 'Portugal', betValue: BetValue.AWAY_WIN },
    ]);

    expect(matched).toHaveLength(0);
    expect(unmatched).toHaveLength(1);
    expect(unmatched[0]).toMatchObject({ home: 'Italy', away: 'Portugal' });
  });
});

const TIPPABGABE_HTML = `
<table id="tippabgabeSpiele"><tbody>
  <tr class="">
    <td>17.06.26 23:00</td>
    <td class="nw">Ghana</td>
    <td class="nw">Panama</td>
    <td class="kicktipp-tippen">
      <input type="tel" id="spieltippForms12345_heimTipp" name="spieltippForms[12345].heimTipp" value="" />
      :
      <input type="tel" id="spieltippForms12345_gastTipp" name="spieltippForms[12345].gastTipp" value="" />
    </td>
    <td>2.50</td>
  </tr>
</tbody></table>`;

describe('parseTippabgabeMatches', () => {
  it('extracts home/away and the tip field names from a form row', () => {
    const matches = parseTippabgabeMatches(TIPPABGABE_HTML);

    expect(matches).toEqual([
      {
        home: 'Ghana',
        away: 'Panama',
        heimField: 'spieltippForms[12345].heimTipp',
        gastField: 'spieltippForms[12345].gastTipp',
      },
    ]);
  });
});
