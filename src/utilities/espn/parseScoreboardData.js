import { getGameKey } from '../../utilities';
import { parseStatus } from './parseGameStatus';

// Extract score for a competitor, returns null if not available
function getScore(competitor) {
  const score = competitor?.score;
  if (score === undefined || score === null || score === '') return null;
  const n = Number(score);
  return isNaN(n) ? null : n;
}

/**
 * Parse ESPN scoreboard JSON into a map of:
 *   espnTeamId (string) -> { score: number|null, opponentScore: number|null, status }
 *
 * Also builds a map: gameKey (sorted espnId pair) -> { topScore, bottomScore, status, topEspnId, bottomEspnId }
 */
export function parseScoreboardData(json) {
  const gameMap = {}; // gameId -> parsed game data

  const events = json?.events ?? [];
  events.forEach((event) => {
    const competition = event?.competitions?.[0];
    if (!competition) return;

    const competitors = competition.competitors ?? [];
    if (competitors.length !== 2) return;

    const status = parseStatus(competition);

    const [c1, c2] = competitors;
    const id1 = String(c1.team?.id ?? '');
    const id2 = String(c2.team?.id ?? '');
    const score1 = getScore(c1);
    const score2 = getScore(c2);

    // Store by both team IDs so we can look up by either
    const key = getGameKey(id1, id2);
    gameMap[key] = {
      status,
      teams: {
        [id1]: { score: score1, opponentScore: score2 },
        [id2]: { score: score2, opponentScore: score1 },
      },
      espnIds: [id1, id2],
    };
  });

  return gameMap;
}