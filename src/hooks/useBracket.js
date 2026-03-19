import { useState, useCallback, useRef } from 'react';
import initialData from '../data/bracket.json';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Returns the espn game key (sorted id pair) for two team objects
function espnKey(teamA, teamB) {
  if (!teamA?.espnId || !teamB?.espnId) return null;
  return [String(teamA.espnId), String(teamB.espnId)].sort().join('-');
}

// Returns winner index (0=top, 1=bottom) only if the game is final.
// statuses: map of espnKey -> { state, display }
// If no status exists for a game (manual entry), fall back to trusting scores.
function getFinalWinner(topTeam, bottomTeam, topScore, bottomScore, statuses) {
  if (topScore === null || bottomScore === null) return null;
  if (topScore === bottomScore) return null;

  // Check if ESPN reports this game as finished
  const key = espnKey(topTeam, bottomTeam);
  if (key && statuses && statuses[key]) {
    if (statuses[key].state !== 'post') return null; // live or pre — not final yet
  }
  // No ESPN status (manual entry) — trust the scores
  return topScore > bottomScore ? 0 : 1;
}

export function useBracket() {
  const [data, setData] = useState(() => deepClone(initialData.tournament));
  const [gameStatuses, setGameStatuses] = useState({});
  // Keep a ref so computeBracket closure always sees latest statuses
  const statusesRef = useRef({});

  const computeBracket = useCallback((tournament, statuses) => {
    const st = statuses ?? statusesRef.current;
    const regions = ['east', 'west', 'south', 'midwest'];
    const result = deepClone(tournament);

    regions.forEach((region) => {
      const seeds = result.regions[region].seeds;
      const games = result.games[region];

      // R1 → R2
      for (let i = 0; i < 4; i++) {
        const g1 = games.r1[i * 2];
        const g2 = games.r1[i * 2 + 1];
        const r2Game = games.r2[i];
        const top1 = seeds[g1.top];
        const bot1 = seeds[g1.bottom];
        const top2 = seeds[g2.top];
        const bot2 = seeds[g2.bottom];
        const w1 = getFinalWinner(top1, bot1, g1.topScore, g1.bottomScore, st);
        const w2 = getFinalWinner(top2, bot2, g2.topScore, g2.bottomScore, st);
        r2Game.topTeam = w1 !== null ? (w1 === 0 ? top1 : bot1) : null;
        r2Game.bottomTeam = w2 !== null ? (w2 === 0 ? top2 : bot2) : null;
      }

      // R2 → R3 (Sweet 16)
      for (let i = 0; i < 2; i++) {
        const g1 = games.r2[i * 2];
        const g2 = games.r2[i * 2 + 1];
        const r3Game = games.r3[i];
        const w1 = getFinalWinner(g1.topTeam, g1.bottomTeam, g1.topScore, g1.bottomScore, st);
        const w2 = getFinalWinner(g2.topTeam, g2.bottomTeam, g2.topScore, g2.bottomScore, st);
        r3Game.topTeam = w1 !== null ? (w1 === 0 ? g1.topTeam : g1.bottomTeam) : null;
        r3Game.bottomTeam = w2 !== null ? (w2 === 0 ? g2.topTeam : g2.bottomTeam) : null;
      }

      // R3 → R4 (Elite 8)
      const r3g1 = games.r3[0];
      const r3g2 = games.r3[1];
      const r4Game = games.r4[0];
      const w3a = getFinalWinner(r3g1.topTeam, r3g1.bottomTeam, r3g1.topScore, r3g1.bottomScore, st);
      const w3b = getFinalWinner(r3g2.topTeam, r3g2.bottomTeam, r3g2.topScore, r3g2.bottomScore, st);
      r4Game.topTeam = w3a !== null ? (w3a === 0 ? r3g1.topTeam : r3g1.bottomTeam) : null;
      r4Game.bottomTeam = w3b !== null ? (w3b === 0 ? r3g2.topTeam : r3g2.bottomTeam) : null;
    });

    // Elite 8 → Final Four
    const ffGames = result.games.finalFour;
    ['east', 'west', 'south', 'midwest'].forEach((region, idx) => {
      const r4 = result.games[region].r4[0];
      const w = getFinalWinner(r4.topTeam, r4.bottomTeam, r4.topScore, r4.bottomScore, st);
      const winner = w !== null ? (w === 0 ? r4.topTeam : r4.bottomTeam) : null;
      ffGames[idx < 2 ? 0 : 1][idx % 2 === 0 ? 'topTeam' : 'bottomTeam'] = winner;
    });

    // Final Four → Championship
    const chGame = result.games.championship[0];
    const wff1 = getFinalWinner(ffGames[0].topTeam, ffGames[0].bottomTeam, ffGames[0].topScore, ffGames[0].bottomScore, st);
    const wff2 = getFinalWinner(ffGames[1].topTeam, ffGames[1].bottomTeam, ffGames[1].topScore, ffGames[1].bottomScore, st);
    chGame.topTeam = wff1 !== null ? (wff1 === 0 ? ffGames[0].topTeam : ffGames[0].bottomTeam) : null;
    chGame.bottomTeam = wff2 !== null ? (wff2 === 0 ? ffGames[1].topTeam : ffGames[1].bottomTeam) : null;

    // Championship winner
    const wch = getFinalWinner(chGame.topTeam, chGame.bottomTeam, chGame.topScore, chGame.bottomScore, st);
    chGame.champion = wch !== null ? (wch === 0 ? chGame.topTeam : chGame.bottomTeam) : null;

    return result;
  }, []);

  const [computed, setComputed] = useState(() =>
    computeBracket(deepClone(initialData.tournament), {})
  );

  const updateScore = useCallback((region, round, gameIdx, side, score) => {
    setData((prev) => {
      const next = deepClone(prev);
      const scoreKey = side === 'top' ? 'topScore' : 'bottomScore';
      if (region === 'finalFour') {
        next.games.finalFour[gameIdx][scoreKey] = score === '' ? null : Number(score);
      } else if (region === 'championship') {
        next.games.championship[0][scoreKey] = score === '' ? null : Number(score);
      } else {
        next.games[region][round][gameIdx][scoreKey] = score === '' ? null : Number(score);
      }
      setComputed(computeBracket(next, statusesRef.current));
      return next;
    });
  }, [computeBracket]);

  // Apply a batch of score updates from ESPN API
  const applyEspnScores = useCallback((scoreUpdates, newStatuses) => {
    // Update the ref immediately so computeBracket sees the new statuses
    if (newStatuses) statusesRef.current = newStatuses;

    setData((prev) => {
      const next = deepClone(prev);
      scoreUpdates.forEach(({ region, round, gameIdx, topScore, bottomScore }) => {
        if (region === 'finalFour') {
          if (topScore !== null) next.games.finalFour[gameIdx].topScore = topScore;
          if (bottomScore !== null) next.games.finalFour[gameIdx].bottomScore = bottomScore;
        } else if (region === 'championship') {
          if (topScore !== null) next.games.championship[0].topScore = topScore;
          if (bottomScore !== null) next.games.championship[0].bottomScore = bottomScore;
        } else if (round) {
          if (topScore !== null) next.games[region][round][gameIdx].topScore = topScore;
          if (bottomScore !== null) next.games[region][round][gameIdx].bottomScore = bottomScore;
        }
      });
      setComputed(computeBracket(next, statusesRef.current));
      return next;
    });

    if (newStatuses) setGameStatuses(newStatuses);
  }, [computeBracket]);

  const resetBracket = useCallback(() => {
    const fresh = deepClone(initialData.tournament);
    statusesRef.current = {};
    setData(fresh);
    setComputed(computeBracket(fresh, {}));
    setGameStatuses({});
  }, [computeBracket]);

  const exportJSON = useCallback(() => {
    return JSON.stringify({ tournament: data }, null, 2);
  }, [data]);

  const importJSON = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const tournament = parsed.tournament || parsed;
      setData(tournament);
      setComputed(computeBracket(tournament, statusesRef.current));
      return true;
    } catch {
      return false;
    }
  }, [computeBracket]);

  return { data, computed, updateScore, applyEspnScores, resetBracket, exportJSON, importJSON, gameStatuses };
}
