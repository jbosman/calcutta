import { expect, test } from 'vitest';
import { buildInitialGames } from './buildInitialGames';
import expectedInitialGames from './__testData__/expected.initialGames.json';

test('Initial game structure should be in expected format', () => {
  expect(buildInitialGames()).toEqual(expectedInitialGames);
})