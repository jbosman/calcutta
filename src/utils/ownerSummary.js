import { ROUND_WIN_PCT, dollarsEarned } from './payouts';

// Round labels for display
export const ROUND_NAMES = ['1st Round', '2nd Round', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

/**
 * Given the computed bracket state and totalPot, return an array of owner summaries:
 * [
 *   {
 *     owner: "Alice Johnson",
 *     teams: [
 *       {
 *         team: "Duke", region: "east", seed: 1, price: 50,
 *         roundsWon: 3,          // how many rounds they've won so far (0 = eliminated in R1)
 *         eliminated: true/false, // have they lost yet?
 *         winnings: 60.48,       // cumulative dollar earnings so far
 *         net: 10.48,            // winnings - price
 *       },
 *       ...
 *     ],
 *     totalPaid: 95,
 *     totalWinnings: 60.48,
 *     totalNet: -34.52,
 *   },
 *   ...
 * ]
 */
export function buildOwnerSummaries(computed, totalPot) {
  const teamStats = {}; // key: `${region}:${seed}` → { roundsWon, eliminated }

  const regions = ['east', 'west', 'south', 'midwest'];

  // Helper: does this team object match a seed entry?
  function teamKey(teamObj) {
    if (!teamObj) return null;
    return `${teamObj.abbr}:${teamObj.seed}:${teamObj.team}`;
  }

  // We'll track per-team how far they've advanced by scanning which games they won
  // A team that appears as winner in r2 has won 1 game (R1), etc.
  const winCount = {}; // teamKey → number of rounds won
  const lostIn = {};   // teamKey → roundIndex they lost in (or undefined if still alive / never played)

  function getWinner(game) {
    if (game.topScore === null || game.bottomScore === null) return null;
    if (game.topScore > game.bottomScore) return game.topTeam || null;
    if (game.bottomScore > game.topScore) return game.bottomTeam || null;
    return null;
  }

  function getLoser(game) {
    if (game.topScore === null || game.bottomScore === null) return null;
    if (game.topScore > game.bottomScore) return game.bottomTeam || null;
    if (game.bottomScore > game.topScore) return game.topTeam || null;
    return null;
  }

  function recordResult(game, roundIndex) {
    const winner = getWinner(game);
    const loser = getLoser(game);
    if (winner) {
      const k = teamKey(winner);
      winCount[k] = (winCount[k] || 0) + 1;
    }
    if (loser) {
      const k = teamKey(loser);
      lostIn[k] = roundIndex;
    }
  }

  // Regional rounds: r1=0, r2=1, r3=2, r4=3
  regions.forEach(region => {
    const games = computed.games[region];
    games.r1.forEach(g => recordResult(g, 0));
    games.r2.forEach(g => recordResult(g, 1));
    games.r3.forEach(g => recordResult(g, 2));
    games.r4.forEach(g => recordResult(g, 3));
  });

  // Final Four: roundIndex 4
  computed.games.finalFour.forEach(g => recordResult(g, 4));

  // Championship: roundIndex 5
  recordResult(computed.games.championship[0], 5);

  // Now build per-owner summaries
  const ownerMap = {};

  regions.forEach(region => {
    computed.regions[region].seeds.forEach(seed => {
      const owner = seed.owner || 'Unassigned';
      const k = teamKey(seed);
      const rounds = winCount[k] || 0;
      const eliminated = lostIn[k] !== undefined;
      const winnings = rounds > 0 ? dollarsEarned(rounds - 1, totalPot) : 0;
      const net = winnings - (seed.price || 0);

      if (!ownerMap[owner]) {
        ownerMap[owner] = {
          owner,
          teams: [],
          totalPaid: 0,
          totalWinnings: 0,
          totalNet: 0,
        };
      }

      ownerMap[owner].teams.push({
        team: seed.team,
        abbr: seed.abbr,
        espnId: seed.espnId || null,
        region,
        seed: seed.seed,
        price: seed.price || 0,
        roundsWon: rounds,
        eliminated,
        winnings,
        net,
        status: eliminated
          ? `Lost in ${ROUND_NAMES[lostIn[k]]}`
          : rounds > 0
            ? `Won ${ROUND_NAMES[rounds - 1]}`
            : 'Not yet played',
      });

      ownerMap[owner].totalPaid += seed.price || 0;
      ownerMap[owner].totalWinnings += winnings;
      ownerMap[owner].totalNet += net;
    });
  });

  // Sort owners by totalNet descending (leaders first)
  return Object.values(ownerMap).sort((a, b) => b.totalNet - a.totalNet);
}
