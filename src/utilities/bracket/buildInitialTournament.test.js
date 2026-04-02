import { expect, test } from 'vitest';
import { buildInitialTournament } from './buildInitialTournament';
import { buildExpectedInitialTournamentJSON } from './__testData__/expoected.initialTournament';

test('Initial tournament structure should be as expected', () => {
  console.log( )
  expect(buildInitialTournament()).toEqual(buildExpectedInitialTournamentJSON());
})