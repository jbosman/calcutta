# Men's NCAA Tournament Bracket 2025-26

A fully interactive March Madness bracket built with React + Vite, styled in an ESPN-inspired dark theme.

## Features

- **All 6 bracket sections**: East, West, South, Midwest, Final Four, Championship
- **Live score entry**: Click any score input to enter scores — winners automatically advance
- **Team owners**: Each team has an assigned owner displayed in the bracket
- **Auto-advancement**: Winners propagate through all rounds including Final Four → Championship → Champion display
- **JSON editor**: Click "Edit JSON" to directly edit teams, owners, and scores
- **Reset**: Clear all scores with one click
- **Dark ESPN-inspired theme** with color-coded regions

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:5173

## How to Update Scores

**Option 1 — Direct input in the bracket:**
Click any score field and type a number. The winner auto-advances when both scores are filled.

**Option 2 — Edit the JSON:**
Click the "Edit JSON" button in the header. You can modify:
- `topScore` / `bottomScore` for any game (use `null` for no score yet)
- Team names (`team`), abbreviations (`abbr`), seeds (`seed`), and owners (`owner`) in the `regions` section

## JSON Structure

```json
{
  "tournament": {
    "regions": {
      "east": {
        "seeds": [
          { "seed": 1, "team": "Duke", "abbr": "DUKE", "owner": "Alice Johnson" },
          ...
        ]
      }
    },
    "games": {
      "east": {
        "r1": [{ "id": "e-r1-g1", "top": 0, "bottom": 1, "topScore": null, "bottomScore": null }],
        "r2": [...],
        "r3": [...],
        "r4": [...]
      },
      "finalFour": [...],
      "championship": [...]
    }
  }
}
```

### Seed Index Mapping (per region)
Seeds are stored as an array. The `top` and `bottom` fields in r1 games are **array indices**:

| Index | Seed | Index | Seed |
|-------|------|-------|------|
| 0     | 1    | 8     | 6    |
| 1     | 16   | 9     | 11   |
| 2     | 8    | 10    | 3    |
| 3     | 9    | 11    | 14   |
| 4     | 5    | 12    | 7    |
| 5     | 12   | 13    | 10   |
| 6     | 4    | 14    | 2    |
| 7     | 13   | 15    | 15   |

## Project Structure

```
march-madness-bracket/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.jsx           # Entry point
    ├── App.jsx            # Root layout
    ├── styles/
    │   └── main.css       # All styles
    ├── data/
    │   └── bracket.json   # All teams, owners, and initial scores
    ├── hooks/
    │   └── useBracket.js  # Bracket state logic + winner propagation
    └── components/
        ├── Matchup.jsx        # Individual game slot with score inputs
        ├── RegionBracket.jsx  # 4-round region bracket (East/West/South/Midwest)
        ├── FinalFourCenter.jsx # Final Four + Championship center section
        └── JsonEditor.jsx     # Modal for editing raw JSON
```
