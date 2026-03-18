import { useState, useCallback } from 'react';
import initialData from '../data/bracket.json';

// Deep clone utility
function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Determine winner index (0 = top, 1 = bottom) based on scores
function getWinner(topScore, bottomScore) {
  if (topScore === null || bottomScore === null) return null;
  if (topScore > bottomScore) return 0; // top wins
  if (bottomScore > topScore) return 1; // bottom wins
  return null; // tie - no winner
}

export function useBracket() {
  const [data, setData] = useState(() => deepClone(initialData.tournament));

  // Compute derived bracket state (who advances to each round)
  const computeBracket = useCallback((tournament) => {
    const regions = ['east', 'west', 'south', 'midwest'];
    const result = deepClone(tournament);

    // For each region, propagate winners through rounds
    regions.forEach((region) => {
      const seeds = result.regions[region].seeds;
      const games = result.games[region];

      // Round 1 → Round 2
      for (let i = 0; i < 4; i++) {
        const g1 = games.r1[i * 2];
        const g2 = games.r1[i * 2 + 1];
        const r2Game = games.r2[i];

        const w1 = getWinner(g1.topScore, g1.bottomScore);
        const w2 = getWinner(g2.topScore, g2.bottomScore);

        r2Game.topTeam = w1 !== null ? seeds[g1[w1 === 0 ? 'top' : 'bottom']] : null;
        r2Game.bottomTeam = w2 !== null ? seeds[g2[w2 === 0 ? 'top' : 'bottom']] : null;
      }

      // Round 2 → Sweet 16
      for (let i = 0; i < 2; i++) {
        const g1 = games.r2[i * 2];
        const g2 = games.r2[i * 2 + 1];
        const r3Game = games.r3[i];

        const w1 = getWinner(g1.topScore, g1.bottomScore);
        const w2 = getWinner(g2.topScore, g2.bottomScore);

        r3Game.topTeam = w1 !== null ? (w1 === 0 ? g1.topTeam : g1.bottomTeam) : null;
        r3Game.bottomTeam = w2 !== null ? (w2 === 0 ? g2.topTeam : g2.bottomTeam) : null;
      }

      // Sweet 16 → Elite 8
      const r3g1 = games.r3[0];
      const r3g2 = games.r3[1];
      const r4Game = games.r4[0];

      const w3a = getWinner(r3g1.topScore, r3g1.bottomScore);
      const w3b = getWinner(r3g2.topScore, r3g2.bottomScore);

      r4Game.topTeam = w3a !== null ? (w3a === 0 ? r3g1.topTeam : r3g1.bottomTeam) : null;
      r4Game.bottomTeam = w3b !== null ? (w3b === 0 ? r3g2.topTeam : r3g2.bottomTeam) : null;
    });

    // Final Four: East/West top half, South/Midwest bottom half
    // ff-g1: East winner vs West winner
    // ff-g2: South winner vs Midwest winner
    const ffGames = result.games.finalFour;
    const regionOrder = ['east', 'west', 'south', 'midwest'];

    regionOrder.forEach((region, idx) => {
      const r4 = result.games[region].r4[0];
      const w = getWinner(r4.topScore, r4.bottomScore);
      const winner = w !== null ? (w === 0 ? r4.topTeam : r4.bottomTeam) : null;

      const ffGameIdx = idx < 2 ? 0 : 1;
      const position = idx % 2 === 0 ? 'topTeam' : 'bottomTeam';
      ffGames[ffGameIdx][position] = winner;
    });

    // Championship
    const chGame = result.games.championship[0];
    const ff1 = ffGames[0];
    const ff2 = ffGames[1];

    const wff1 = getWinner(ff1.topScore, ff1.bottomScore);
    const wff2 = getWinner(ff2.topScore, ff2.bottomScore);

    chGame.topTeam = wff1 !== null ? (wff1 === 0 ? ff1.topTeam : ff1.bottomTeam) : null;
    chGame.bottomTeam = wff2 !== null ? (wff2 === 0 ? ff2.topTeam : ff2.bottomTeam) : null;

    const wch = getWinner(chGame.topScore, chGame.bottomScore);
    chGame.champion = wch !== null ? (wch === 0 ? chGame.topTeam : chGame.bottomTeam) : null;

    return result;
  }, []);

  const [computed, setComputed] = useState(() => computeBracket(deepClone(initialData.tournament)));

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

      const updated = computeBracket(next);
      setComputed(updated);
      return next;
    });
  }, [computeBracket]);

  const resetBracket = useCallback(() => {
    const fresh = deepClone(initialData.tournament);
    setData(fresh);
    setComputed(computeBracket(fresh));
  }, [computeBracket]);

  const exportJSON = useCallback(() => {
    return JSON.stringify({ tournament: data }, null, 2);
  }, [data]);

  const importJSON = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const tournament = parsed.tournament || parsed;
      const updated = computeBracket(tournament);
      setData(tournament);
      setComputed(updated);
      return true;
    } catch {
      return false;
    }
  }, [computeBracket]);

  return { data, computed, updateScore, resetBracket, exportJSON, importJSON };
}
