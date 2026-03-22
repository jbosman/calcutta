import { useState, useCallback, useRef } from 'react';
import initialData from '../data/bracket.json';

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

// Build a fresh blank games structure from the regions in bracket.json.
// R1 matchups follow the standard NCAA bracket seeding pattern:
// (1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15) using seed array indices.
function buildInitialGames() {
  const regionKeys = ['east', 'west', 'south', 'midwest'];
  const games = {};

  regionKeys.forEach((region) => {
    const p = region[0]; // e, w, s, m
    games[region] = {
      // R1: 8 games — top/bottom are indices into the seeds array
      // Seeds array order: [1,16, 8,9, 5,12, 4,13, 6,11, 3,14, 7,10, 2,15]
      r1: [
        { id: `${p}-r1-g1`, top: 0,  bottom: 1,  topScore: null, bottomScore: null },
        { id: `${p}-r1-g2`, top: 2,  bottom: 3,  topScore: null, bottomScore: null },
        { id: `${p}-r1-g3`, top: 4,  bottom: 5,  topScore: null, bottomScore: null },
        { id: `${p}-r1-g4`, top: 6,  bottom: 7,  topScore: null, bottomScore: null },
        { id: `${p}-r1-g5`, top: 8,  bottom: 9,  topScore: null, bottomScore: null },
        { id: `${p}-r1-g6`, top: 10, bottom: 11, topScore: null, bottomScore: null },
        { id: `${p}-r1-g7`, top: 12, bottom: 13, topScore: null, bottomScore: null },
        { id: `${p}-r1-g8`, top: 14, bottom: 15, topScore: null, bottomScore: null },
      ],
      r2: [
        { id: `${p}-r2-g1`, topScore: null, bottomScore: null },
        { id: `${p}-r2-g2`, topScore: null, bottomScore: null },
        { id: `${p}-r2-g3`, topScore: null, bottomScore: null },
        { id: `${p}-r2-g4`, topScore: null, bottomScore: null },
      ],
      r3: [
        { id: `${p}-r3-g1`, topScore: null, bottomScore: null },
        { id: `${p}-r3-g2`, topScore: null, bottomScore: null },
      ],
      r4: [
        { id: `${p}-r4-g1`, topScore: null, bottomScore: null },
      ],
    };
  });

  games.finalFour = [
    { id: 'ff-g1', topScore: null, bottomScore: null },
    { id: 'ff-g2', topScore: null, bottomScore: null },
  ];

  games.championship = [
    { id: 'ch-g1', topScore: null, bottomScore: null },
  ];

  return games;
}

// Merge regions from JSON with a fresh games structure
function buildInitialTournament() {
  return {
    ...deepClone(initialData.tournament),
    games: buildInitialGames(),
  };
}

// Returns the ESPN game key (sorted id pair) for two team objects
function espnKey(teamA, teamB) {
  if (!teamA?.espnId || !teamB?.espnId) return null;
  return [String(teamA.espnId), String(teamB.espnId)].sort().join('-');
}

// Returns winner index (0=top, 1=bottom) only if the game is final.
// If no ESPN status exists for a game, fall back to trusting the scores (manual entry).
function getFinalWinner(topTeam, bottomTeam, topScore, bottomScore, statuses) {
  if (topScore === null || bottomScore === null) return null;
  if (topScore === bottomScore) return null;

  const key = espnKey(topTeam, bottomTeam);
  if (key && statuses && statuses[key]) {
    if (statuses[key].state !== 'post') return null;
  }
  return topScore > bottomScore ? 0 : 1;
}

export function useBracket() {
  const [data, setData] = useState(() => buildInitialTournament());
  const [gameStatuses, setGameStatuses] = useState({});
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

    const wch = getFinalWinner(chGame.topTeam, chGame.bottomTeam, chGame.topScore, chGame.bottomScore, st);
    chGame.champion = wch !== null ? (wch === 0 ? chGame.topTeam : chGame.bottomTeam) : null;

    return result;
  }, []);

  const [computed, setComputed] = useState(() =>
    computeBracket(buildInitialTournament(), {})
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

  const applyEspnScores = useCallback((scoreUpdates, newStatuses) => {
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

  // Two-pass apply: writes all scores, computes bracket (advancing R1→R2 winners),
  // then immediately re-matches against the ESPN map to pick up R2+ scores —
  // all synchronously inside one setData call, no React render cycle between passes.
  const applyEspnScoresFull = useCallback((pass1Updates, newStatuses, gameMap, matchFn) => {
    if (newStatuses) statusesRef.current = newStatuses;

    setData((prev) => {
      // ── Pass 1: write all scores we found ──
      const next = deepClone(prev);

      function writeUpdates(updates, data) {
        updates.forEach(({ region, round, gameIdx, topScore, bottomScore }) => {
          if (region === 'finalFour') {
            if (topScore !== null) data.games.finalFour[gameIdx].topScore = topScore;
            if (bottomScore !== null) data.games.finalFour[gameIdx].bottomScore = bottomScore;
          } else if (region === 'championship') {
            if (topScore !== null) data.games.championship[0].topScore = topScore;
            if (bottomScore !== null) data.games.championship[0].bottomScore = bottomScore;
          } else if (round) {
            if (topScore !== null) data.games[region][round][gameIdx].topScore = topScore;
            if (bottomScore !== null) data.games[region][round][gameIdx].bottomScore = bottomScore;
          }
        });
      }

      writeUpdates(pass1Updates, next);

      // ── Compute bracket after pass 1 — R1 winners now advance to R2 ──
      const comp1 = computeBracket(next, statusesRef.current);

      // ── Pass 2: re-enrich with R2+ espnIds from comp1, re-match ──
      const enriched = deepClone(comp1);
      const regions = ['east', 'west', 'south', 'midwest'];
      regions.forEach((region) => {
        ['r2', 'r3', 'r4'].forEach((round) => {
          comp1.games[region][round].forEach((game, idx) => {
            enriched.games[region][round][idx].topTeamEspnId    = game.topTeam?.espnId ?? null;
            enriched.games[region][round][idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
          });
        });
      });
      comp1.games.finalFour.forEach((game, idx) => {
        enriched.games.finalFour[idx].topTeamEspnId    = game.topTeam?.espnId ?? null;
        enriched.games.finalFour[idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
      });
      const ch = comp1.games.championship[0];
      enriched.games.championship[0].topTeamEspnId    = ch.topTeam?.espnId ?? null;
      enriched.games.championship[0].bottomTeamEspnId = ch.bottomTeam?.espnId ?? null;

      const pass2Updates = matchFn(enriched, gameMap);
      writeUpdates(pass2Updates, next);

      // ── Final compute with all scores applied ──
      setComputed(computeBracket(next, statusesRef.current));
      return next;
    });

    if (newStatuses) setGameStatuses(newStatuses);
  }, [computeBracket]);

  const resetBracket = useCallback(() => {
    const fresh = buildInitialTournament();
    statusesRef.current = {};
    setData(fresh);
    setComputed(computeBracket(fresh, {}));
    setGameStatuses({});
  }, [computeBracket]);

  const exportJSON = useCallback(() => {
    // Export only the team/owner data — no game scores
    return JSON.stringify({ tournament: { name: data.name, regions: data.regions } }, null, 2);
  }, [data]);

  const importJSON = useCallback((jsonString) => {
    try {
      const parsed = JSON.parse(jsonString);
      const incoming = parsed.tournament || parsed;
      // Merge imported regions with fresh games so scores don't carry over
      const tournament = {
        ...incoming,
        games: buildInitialGames(),
      };
      setData(tournament);
      setComputed(computeBracket(tournament, statusesRef.current));
      return true;
    } catch {
      return false;
    }
  }, [computeBracket]);

  return { data, computed, updateScore, applyEspnScores, applyEspnScoresFull, resetBracket, exportJSON, importJSON, gameStatuses };
}
