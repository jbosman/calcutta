/**
 * Given computed bracket state and getGameStatus, returns the index (0–3)
 * of the first incomplete round for a region.
 *
 * A round is "complete" when every game in it has a Final status from ESPN.
 * Falls back to checking scores if no ESPN status is available (manual entry).
 *
 * Returns 0 if no games have started yet (show R1 by default).
 * Returns 3 (Elite 8) if all regional rounds are done.
 */
export function getActiveRoundIndex(regionKey, computed, getGameStatus) {
  const seeds = computed.regions[regionKey].seeds;
  const games = computed.games[regionKey];
  const rounds = ['r1', 'r2', 'r3', 'r4'];

  function getTeams(round, game) {
    if (round === 'r1') {
      return { top: seeds[game.top], bottom: seeds[game.bottom] };
    }
    return { top: game.topTeam, bottom: game.bottomTeam };
  }

  function isGameComplete(round, game) {
    const { top, bottom } = getTeams(round, game);

    // If ESPN status is available, trust it
    if (getGameStatus && top && bottom) {
      const status = getGameStatus(top.espnId, bottom.espnId);
      if (status) return status.state === 'post';
    }

    // Fallback: both scores present and different (manual entry)
    return game.topScore !== null &&
           game.bottomScore !== null &&
           game.topScore !== game.bottomScore;
  }

  for (let rIdx = 0; rIdx < rounds.length; rIdx++) {
    const round = rounds[rIdx];
    const roundGames = games[round];

    // Skip rounds where no teams have been seeded yet (later rounds before R1 finishes)
    const hasTeams = roundGames.some((g) => {
      const { top, bottom } = getTeams(round, g);
      return top !== null && top !== undefined && bottom !== null && bottom !== undefined;
    });

    if (!hasTeams) return Math.max(0, rIdx - 1);

    const allComplete = roundGames.every((g) => isGameComplete(round, g));
    if (!allComplete) return rIdx;
  }

  // All rounds complete — stay on Elite 8
  return rounds.length - 1;
}
