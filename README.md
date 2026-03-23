# Calcutta Tournament Bracket 2025–26

An interactive NCAA March Madness bracket tracker built with React + Vite. Scores sync automatically from the ESPN API, winners advance through the bracket in real time, and an owner leaderboard tracks each participant's winnings and net position as games complete.

## Features

**Bracket display**
- All 6 bracket sections — East, West, South, Midwest, Final Four, Championship, each in its own card
- Color-coded regions — East (orange), West (blue), South (green), Midwest (purple)
- SVG bracket connector lines linking each game to the next round, aligned to the divider between the two team slots
- Desktop: all four rounds displayed side by side with connector lines between them
- Mobile: current round + next round shown side by side with connector lines, tab bar to switch rounds; auto-advances to the first incomplete round on page load

**Game cards**
- Team logo, seed, name, owner, and auction price on each team slot
- Net value shown on every team slot — before a game is decided shows current value (earnings to date minus price paid); after Final updates to reflect winner's actual net and loser's final net
- Game status badge at the top of each card: scheduled date/time for upcoming games, live clock and score for in-progress games, or Final for completed games. Tip times shown as "Mar 26 · 7:10 PM ET"; games with no confirmed time show just the date

**Live ESPN score sync**
- Fetches all tournament round dates in parallel (10 requests covering R1 through Championship) so completed games from prior days are always included
- Two-pass sync on load: first pass applies R1 scores and advances winners, second pass immediately applies R2+ scores — no manual sync needed
- Auto-refresh every 60 seconds with an ON/OFF toggle; manual Sync Scores button in the header
- Teams only advance and winnings only accrue once ESPN marks a game as Final
- Last updated timestamp shown after each successful fetch

**Payout structure**
- Each round header shows the cumulative pot percentage and dollar value a team earns by winning through that round
- Net value on each team card updates in real time as games complete

**Owner Leaderboard**
- Positioned above the bracket for quick reference
- Shows every owner's teams, auction spend, winnings, and net position
- Expandable per-owner detail with each team's game status (live score, tip time, or result), round progress dots, and financials
- Only records wins/losses for officially Final games

**Team logos** — loaded from ESPN's CDN using each team's ESPN ID, with a letter fallback if unavailable

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

> **Note:** Always use `npm run preview` or a local server — opening `dist/index.html` directly via `file://` will fail due to CORS restrictions.

## Payout Structure

| Round | Win Earns | Cumulative |
|---|---|---|
| 1st Round | 1% of pot | 1% |
| 2nd Round | 1.5% of pot | 2.5% |
| Sweet 16 | 2% of pot | 4.5% |
| Elite 8 | 4% of pot | 8.5% |
| Final Four | 4% of pot | 12.5% |
| Championship | 4% of pot | 16.5% |

Percentages are defined in `src/utils/payouts.js`.

## Updating Teams & Owners

Edit `src/data/bracket.json`. The file contains only team and owner data — game scores come from ESPN at runtime.

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

| Field | Description |
|---|---|
| `seed` | NCAA seed number (1–16) |
| `team` | Full team name |
| `abbr` | Short abbreviation shown in leaderboard chips |
| `espnId` | ESPN team ID — used to fetch the logo and match live scores |
| `owner` | Owner name shown in the bracket and leaderboard |
| `price` | Amount the owner paid at the Calcutta auction |

### Seeds array order (per region)

The array index determines which R1 matchup a team appears in:

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
├── vite.config.js               # base: './' for file:// compatibility
└── src/
    ├── main.jsx                 # Entry point
    ├── App.jsx                  # Root layout, ESPN sync orchestration
    ├── assets/
    │   └── copa-america-logo.jpg
    ├── data/
    │   └── bracket.json         # Teams, owners, prices (no game scores)
    ├── styles/
    │   └── main.css             # All styles (desktop + tablet + mobile)
    ├── hooks/
    │   ├── useBracket.js        # Bracket state, two-pass score application, winner propagation
    │   └── useEspnScores.js     # ESPN API fetching, multi-date parallel requests, status parsing
    ├── utils/
    │   ├── payouts.js           # Payout percentages and dollar calculations
    │   ├── ownerSummary.js      # Derives per-owner standings from bracket state
    │   └── currentRound.js      # Computes the first incomplete round per region (for mobile tab default)
    └── components/
        ├── Matchup.jsx          # Game card: logos, scores, status badge, net value
        ├── RegionBracket.jsx    # 4-round region with SVG connectors (desktop) and split view (mobile)
        ├── FinalFourCenter.jsx  # Final Four + Championship section
        ├── TotalPotBanner.jsx   # Total pot, team count, and owner count banner
        ├── OwnerSummary.jsx     # Owner leaderboard with expandable team detail
        └── JsonEditor.jsx       # Modal for editing bracket.json in-browser
```
