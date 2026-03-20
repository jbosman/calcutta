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
    if (!getGameStatus || !topTeam || !bottomTeam) return true;
    const status = getGameStatus(topTeam.espnId, bottomTeam.espnId);
    if (!status) return true;
    return status.state === 'post';
  }

  function recordResult(topTeam, bottomTeam, topScore, bottomScore, roundIndex) {
    if (topScore === null || bottomScore === null || !topTeam || !bottomTeam) return;
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
    games.r1.forEach(g => recordResult(seeds[g.top], seeds[g.bottom], g.topScore, g.bottomScore, 0));
    games.r2.forEach(g => recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 1));
    games.r3.forEach(g => recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 2));
    games.r4.forEach(g => recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 3));
  });
  computed.games.finalFour.forEach(g => recordResult(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, 4));
  const ch = computed.games.championship[0];
  recordResult(ch.topTeam, ch.bottomTeam, ch.topScore, ch.bottomScore, 5);

  // ---------------------------------------------------------------
  // Build a lookup: teamKey → { opponent, gameStatus, topScore, bottomScore, isTop }
  // Scans all game slots to find a team's active (non-final) or upcoming game.
  // ---------------------------------------------------------------
  const teamGameInfo = {}; // teamKey → game info

  function indexGame(teamA, teamB, topScore, bottomScore, isTeamATop) {
    if (!teamA || !teamB) return;
    const status = getGameStatus ? getGameStatus(teamA.espnId, teamB.espnId) : null;
    const kA = teamKey(teamA);
    const kB = teamKey(teamB);
    // Store for both teams
    [{ k: kA, team: teamA, opp: teamB, isTop: isTeamATop },
     { k: kB, team: teamB, opp: teamA, isTop: !isTeamATop }].forEach(({ k, opp, isTop }) => {
      if (!teamGameInfo[k]) {
        teamGameInfo[k] = {
          opponent: opp,
          gameStatus: status,
          topScore: isTop ? topScore : bottomScore,
          bottomScore: isTop ? bottomScore : topScore,
          myScore: isTop ? topScore : bottomScore,
          oppScore: isTop ? bottomScore : topScore,
        };
      }
    });
  }

  regions.forEach(region => {
    const seeds = computed.regions[region].seeds;
    const games = computed.games[region];
    games.r1.forEach(g => indexGame(seeds[g.top], seeds[g.bottom], g.topScore, g.bottomScore, true));
    games.r2.forEach(g => indexGame(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, true));
    games.r3.forEach(g => indexGame(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, true));
    games.r4.forEach(g => indexGame(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, true));
  });
  computed.games.finalFour.forEach(g => indexGame(g.topTeam, g.bottomTeam, g.topScore, g.bottomScore, true));
  indexGame(ch.topTeam, ch.bottomTeam, ch.topScore, ch.bottomScore, true);
  // ---------------------------------------------------------------

  const ownerMap = {};

  regions.forEach(region => {
    computed.regions[region].seeds.forEach(seed => {
      const owner = seed.owner || 'Unassigned';
      const k = teamKey(seed);
      const rounds = winCount[k] || 0;
      const eliminated = lostIn[k] !== undefined;
      const winnings = rounds > 0 ? dollarsEarned(rounds - 1, totalPot) : 0;
      const net = winnings - (seed.price || 0);
      const gameInfo = teamGameInfo[k] || null;

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
            : gameInfo?.gameStatus?.state === 'in'
              ? 'In Progress'
              : gameInfo?.gameStatus?.state === 'pre'
                ? `Up Next · ${gameInfo.gameStatus.display}`
                : 'Not yet played',
        gameInfo, // { opponent, gameStatus, myScore, oppScore }
      });

      ownerMap[owner].totalPaid += seed.price || 0;
      ownerMap[owner].totalWinnings += winnings;
      ownerMap[owner].totalNet += net;
    });
  });

  return Object.values(ownerMap).sort((a, b) => b.totalNet - a.totalNet);
}
