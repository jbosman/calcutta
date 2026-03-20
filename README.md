# Calcutta Tournament Bracket 2025–26

An interactive NCAA March Madness bracket tracker built with React + Vite. Scores sync automatically from the ESPN API, winners advance through the bracket in real time, and an owner leaderboard tracks each participant's winnings and net position as games complete.

## Features

- **Live ESPN score sync** — fetches scores from ESPN's scoreboard API every 60 seconds, with a manual sync button
- **Smart advancement** — teams only advance to the next round once a game is officially marked Final by ESPN; in-progress scores are shown but don't advance brackets
- **All 6 bracket sections** — East, West, South, Midwest, Final Four, Championship, each in its own card
- **Game status badges** — each matchup shows tip time, live game clock, or Final
- **Team owners & Calcutta pricing** — each team displays its owner and the price they paid
- **Round payout display** — each round header shows the cumulative pot percentage and dollar amount a team earns by winning through that round
- **Owner Leaderboard** — live-updating summary of every owner's teams, winnings, and net position (only updates when games are Final)
- **Team logos** — loaded from ESPN's CDN using each team's ESPN ID
- **Mobile-friendly** — per-region round tabs on mobile; single-column game cards; responsive header
- **Color-coded regions** — East (orange), West (blue), South (green), Midwest (purple)

## Quick Start

```bash
npm install
npm run dev
```

Then open http://localhost:5173

For a production build:

```bash
npm run build
npm run preview
```

> **Note:** Always use `npm run preview` or a local server to view the production build — opening `dist/index.html` directly in a browser will fail due to CORS restrictions on the `file://` protocol.

## How Scores Work

Scores are fetched automatically from ESPN's unofficial scoreboard API on page load and every 60 seconds thereafter. You can also click **Sync Scores** in the header to fetch immediately.

- **Auto ON/OFF toggle** — disables the 60-second auto-refresh if you want to pause updates
- **Last updated timestamp** — shown next to the sync button after each successful fetch
- Teams only advance and winnings only accrue once ESPN marks a game as **Final**. Live in-progress scores are displayed but do not affect bracket advancement or owner standings.

## Payout Structure

| Round | Win Earns | Cumulative |
|---|---|---|
| 1st Round | 1% of pot | 1% |
| 2nd Round | 1.5% of pot | 2.5% |
| Sweet 16 | 2% of pot | 4.5% |
| Elite 8 | 4% of pot | 8.5% |
| Final Four | 4% of pot | 12.5% |
| Championship | 4% of pot | 16.5% |

These percentages are defined in `src/utils/payouts.js` and can be adjusted there.

## Updating Teams & Owners

Edit `src/data/bracket.json` directly. The file contains only team and owner data — no game scores (those come from ESPN at runtime).

```json
{
  "tournament": {
    "name": "Men's NCAA Tournament Bracket 2025-26",
    "regions": {
      "east": {
        "label": "EAST",
        "seeds": [
          {
            "seed": 1,
            "team": "Duke",
            "abbr": "DUKE",
            "espnId": 150,
            "owner": "Sam",
            "price": 296
          }
        ]
      }
    }
  }
}
```

Each seed entry fields:

| Field | Description |
|---|---|
| `seed` | NCAA seed number (1–16) |
| `team` | Full team name |
| `abbr` | Short abbreviation displayed in chips |
| `espnId` | ESPN team ID — used to fetch the logo and match live scores |
| `owner` | Owner name shown in the bracket and leaderboard |
| `price` | Amount the owner paid in the Calcutta auction |

### Seeds Array Order (per region)

Seeds are stored in the order the NCAA bracket pairs them. The array index determines which R1 matchup a team appears in:

| Index | Seed | Index | Seed |
|-------|------|-------|------|
| 0 | 1 | 8 | 6 |
| 1 | 16 | 9 | 11 |
| 2 | 8 | 10 | 3 |
| 3 | 9 | 11 | 14 |
| 4 | 5 | 12 | 7 |
| 5 | 12 | 13 | 10 |
| 6 | 4 | 14 | 2 |
| 7 | 13 | 15 | 15 |

## Project Structure

```
project/
├── index.html
├── package.json
├── vite.config.js           # base: './' for file:// compatibility
└── src/
    ├── main.jsx             # Entry point
    ├── App.jsx              # Root layout, ESPN sync orchestration
    ├── assets/
    │   └── copa-america-logo.jpg  # Header logo
    ├── data/
    │   └── bracket.json    # Teams, owners, prices (no game scores)
    ├── styles/
    │   └── main.css        # All styles (desktop + tablet + mobile)
    ├── hooks/
    │   ├── useBracket.js   # Bracket state, winner propagation, score application
    │   └── useEspnScores.js # ESPN API fetching, score parsing, game status
    ├── utils/
    │   ├── payouts.js      # Payout percentages and dollar calculations
    │   └── ownerSummary.js # Derives per-owner standings from bracket state
    └── components/
        ├── Matchup.jsx         # Single game card with scores and status badge
        ├── RegionBracket.jsx   # 4-round region (desktop columns + mobile tabs)
        ├── FinalFourCenter.jsx # Final Four + Championship section
        ├── OwnerSummary.jsx    # Owner leaderboard with expandable team detail
        └── JsonEditor.jsx      # Modal for editing bracket.json in-browser
```
