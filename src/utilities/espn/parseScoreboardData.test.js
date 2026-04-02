import { expect, test } from 'vitest';
import { parseScoreboardData } from "./parseScoreboardData";

import fetchedScores from './__testData__/fetchedScores.json';
import expectedParsedScoreboardData from './__testData__/expected.parseScoreboardData.json';

test('parseScoreboardData should parse fetched espn game data as expected', () => {
  expect(parseScoreboardData(fetchedScores)).toEqual(expectedParsedScoreboardData);
})