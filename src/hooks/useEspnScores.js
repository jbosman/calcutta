import { useState, useCallback, useRef } from 'react';

// ESPN scoreboard API — groups=50 returns all D1 games including NCAA tournament
// We fetch a wide date range to catch all tournament rounds in one call
const ESPN_SCOREBOARD_URL =
  'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&limit=200&dates=20260317-20260407';

// Normalise a game status from ESPN into something we can display
// Returns { state: 'pre'|'in'|'post', display: string }
function parseStatus(competition) {
  const status = competition.status;
  const type = status?.type;

  if (type?.state === 'post') {
    return { state: 'post', display: 'Final' };
  }

  if (type?.state === 'in') {
    const period = status.period || '';
    const clock = status.displayClock || '';
    // Map period numbers to readable halves
    const periodLabel = period === 1 ? '1st' : period === 2 ? '2nd' : `OT${period - 2}`;
    return { state: 'in', display: clock ? `${clock} ${periodLabel}` : periodLabel };
  }

  // Pre-game — show scheduled tip time
  const dateStr = competition.date;
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      const time = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
        hour12: true,
      });
      return { state: 'pre', display: time };
    } catch {
      return { state: 'pre', display: '' };
    }
  }

  return { state: 'pre', display: '' };
}

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
function parseScoreboardData(json) {
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
    const key = [id1, id2].sort().join('-');
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

/**
 * Given the bracket data and the ESPN game map, produce an array of score updates:
 * [{ region, round, gameIdx, topScore, bottomScore, status }]
 *
 * Matching strategy: look up each R1 game by (topTeam.espnId, bottomTeam.espnId).
 * For later rounds, teams have already advanced so use topTeam/bottomTeam from computed.
 */
export function matchEspnScoresToBracket(bracketData, gameMap) {
  const updates = [];
  const regions = ['east', 'west', 'south', 'midwest'];
  const roundKeys = ['r1', 'r2', 'r3', 'r4'];

  regions.forEach((region) => {
    const seeds = bracketData.regions[region].seeds;
    const games = bracketData.games[region];

    roundKeys.forEach((round, rIdx) => {
      games[round].forEach((game, gIdx) => {
        let topEspnId, bottomEspnId;

        if (round === 'r1') {
          topEspnId = String(seeds[game.top]?.espnId ?? '');
          bottomEspnId = String(seeds[game.bottom]?.espnId ?? '');
        } else {
          // For later rounds, teams come from the computed bracket
          // We receive bracketData (raw data), so we need to check topTeam/bottomTeam
          // which are only on the computed state — pass those in separately
          topEspnId = String(game.topTeamEspnId ?? '');
          bottomEspnId = String(game.bottomTeamEspnId ?? '');
        }

        if (!topEspnId || !bottomEspnId) return;

        const key = [topEspnId, bottomEspnId].sort().join('-');
        const espnGame = gameMap[key];
        if (!espnGame) return;

        const topData = espnGame.teams[topEspnId];
        const bottomData = espnGame.teams[bottomEspnId];

        updates.push({
          region,
          round,
          gameIdx: gIdx,
          topScore: topData?.score ?? null,
          bottomScore: bottomData?.score ?? null,
          status: espnGame.status,
        });
      });
    });
  });

  // Final Four and Championship
  const ffRounds = [
    { key: 'finalFour', idx: 0 },
    { key: 'finalFour', idx: 1 },
    { key: 'championship', idx: 0 },
  ];

  ffRounds.forEach(({ key, idx }) => {
    const game = key === 'finalFour'
      ? bracketData.games.finalFour[idx]
      : bracketData.games.championship[0];

    const topEspnId = String(game?.topTeamEspnId ?? '');
    const bottomEspnId = String(game?.bottomTeamEspnId ?? '');

    if (!topEspnId || !bottomEspnId) return;

    const lookupKey = [topEspnId, bottomEspnId].sort().join('-');
    const espnGame = gameMap[lookupKey];
    if (!espnGame) return;

    updates.push({
      region: key,
      round: null,
      gameIdx: idx,
      topScore: espnGame.teams[topEspnId]?.score ?? null,
      bottomScore: espnGame.teams[bottomEspnId]?.score ?? null,
      status: espnGame.status,
    });
  });

  return updates;
}

export function useEspnScores() {
  const [lastUpdated, setLastUpdated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [gameStatuses, setGameStatuses] = useState({}); // key: gameId -> status object
  const [gameMap, setGameMap] = useState({});
  const intervalRef = useRef(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(ESPN_SCOREBOARD_URL);
      if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);
      const json = await res.json();
      const parsed = parseScoreboardData(json);
      setGameMap(parsed);
      setLastUpdated(new Date());

      // Build a flat status map keyed by sorted espnId pair
      const statuses = {};
      Object.entries(parsed).forEach(([key, val]) => {
        statuses[key] = val.status;
      });
      setGameStatuses(statuses);

      return parsed;
    } catch (err) {
      setError(err.message || 'Failed to fetch scores');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const startAutoRefresh = useCallback((intervalMs = 60000) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(fetchScores, intervalMs);
  }, [fetchScores]);

  const stopAutoRefresh = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Given bracket data and computed state, return score updates
  const getScoreUpdates = useCallback((bracketData, computedData) => {
    if (!gameMap || Object.keys(gameMap).length === 0) return [];

    // Annotate bracket games with espnIds from computed advanced teams
    const enriched = JSON.parse(JSON.stringify(bracketData));
    const regions = ['east', 'west', 'south', 'midwest'];
    const roundKeys = ['r2', 'r3', 'r4'];

    regions.forEach((region) => {
      const compGames = computedData.games[region];
      roundKeys.forEach((round) => {
        compGames[round].forEach((game, idx) => {
          enriched.games[region][round][idx].topTeamEspnId = game.topTeam?.espnId ?? null;
          enriched.games[region][round][idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
        });
      });
    });

    // Final Four
    computedData.games.finalFour.forEach((game, idx) => {
      enriched.games.finalFour[idx].topTeamEspnId = game.topTeam?.espnId ?? null;
      enriched.games.finalFour[idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
    });

    // Championship
    const ch = computedData.games.championship[0];
    enriched.games.championship[0].topTeamEspnId = ch.topTeam?.espnId ?? null;
    enriched.games.championship[0].bottomTeamEspnId = ch.bottomTeam?.espnId ?? null;

    return matchEspnScoresToBracket(enriched, gameMap);
  }, [gameMap]);

  // Get status for a specific game by the two team espnIds
  const getGameStatus = useCallback((topEspnId, bottomEspnId) => {
    if (!topEspnId || !bottomEspnId) return null;
    const key = [String(topEspnId), String(bottomEspnId)].sort().join('-');
    return gameStatuses[key] ?? null;
  }, [gameStatuses]);

  return {
    fetchScores,
    startAutoRefresh,
    stopAutoRefresh,
    loading,
    error,
    lastUpdated,
    getScoreUpdates,
    getGameStatus,
    gameMap,
  };
}
