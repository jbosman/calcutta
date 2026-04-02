// Build a fresh blank games structure from the regions in bracket.json.
// R1 matchups follow the standard NCAA bracket seeding pattern:
// (1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15) using seed array indices.
export function buildInitialGames() {
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