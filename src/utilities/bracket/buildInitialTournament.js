import initialData from '../../data/bracket.json';
import { buildInitialGames } from './buildInitialGames';
import { deepClone } from '../../utilities';

// Merge regions from JSON with a fresh games structure
export function buildInitialTournament() {
  return {
    ...deepClone(initialData.tournament),
    games: buildInitialGames(),
  };
}