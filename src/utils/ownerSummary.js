import { dollarsEarned } from './payouts';

// Round labels for display
export const ROUND_NAMES = ['1st Round', '2nd Round', 'Sweet 16', 'Elite 8', 'Final Four', 'Championship'];

export function buildOwnerSummaries(computed, totalPot, getGameStatus) {
  const regions = ['east', 'west', 'south', 'midwest'];

  function teamKey(teamObj) {
    if (!teamObj) return null;
    return `${teamObj.abbr}:${teamObj.seed}:${teamObj.team}`;
  }

  const winCount = {};
  const lostIn = {};

  function isGameFinal(topTeam, bottomTeam) {
    // If no getGameStatus function provided (e.g. no ESPN data yet),
    // treat any completed score as final so manually entered scores still work
    if (!getGameStatus || !topTeam || !bottomTeam) return true;
    const status = getGameStatus(topTeam.espnId, bottomTeam.espnId);
    // If ESPN has no status for this game yet, fall back to trusting the scores
    if (!status) return true;
    return status.state === 'post';
  }

  function recordResult(topTeam, bottomTeam, topScore, bottomScore, roundIndex) {
    if (topScore === null || bottomScore === null || !topTeam || !bottomTeam) return;
    // Only count the result if the game is officially final
    if (!isGameFinal(topTeam, bottomTeam)) return;
    const topKey = teamKey(topTeam);
    const bottomKey = teamKey(bottomTeam);
    if (topScore > bottomScore) {
      winCount[topKey] = (winCount[topKey] || 0) + 1;
      lostIn[bottomKey] = roundIndex;
    } else if (bottomScore > topScore) {
      winCount[bottomKey] = (winCount[bottomKey] || 0) + 1;
      lostIn[topKey] = roundIndex;
    }
  }

  regions.forEach(region => {
    const seeds = computed.regions[region].seeds;
    const games = computed.games[region];

    // R1: teams referenced by seed index
    games.r1.forEach(g => {
      recordResult(seeds[g.top], seeds[g.bottom], g.topScore, g.bottomScore, 0);
    });

    // R2–R4: teams referenced by topTeam/bottomTeam objects
    games.r2.forEach(g => recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 1));
    games.r3.forEach(g => recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 2));
    games.r4.forEach(g => recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 3));
  });

  // Final Four: roundIndex 4
  computed.games.finalFour.forEach(g =>
    recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 4)
  );

  // Championship: roundIndex 5
  const ch = computed.games.championship[0];
  recordResult(ch.topTeam, ch.bottomTeam, ch.topScore, ch.bottomScore, 5);

  // Build per-owner summaries
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
        ownerMap[owner] = { owner, teams: [], totalPaid: 0, totalWinnings: 0, totalNet: 0 };
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

  return Object.values(ownerMap).sort((a, b) => b.totalNet - a.totalNet);
}
