// ESPN scoreboard API — groups=50 returns all D1 games including NCAA tournament.
// The dates param only accepts a single YYYYMMDD date per request, so we fetch
// all tournament round dates in parallel and merge the results.
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard?groups=50&limit=200';

// All dates that have NCAA tournament games
const TOURNAMENT_DATES = [
  '20260319', '20260320', // 1st Round
  '20260321', '20260322', // 2nd Round
  '20260326', '20260327', // Sweet 16
  '20260328', '20260329', // Elite 8
  '20260404',             // Final Four
  '20260406',             // Championship
];

async function fetchAllTournamentGames() {
  const results = await Promise.allSettled(
    TOURNAMENT_DATES.map(date =>
      fetch(`${ESPN_BASE}&dates=${date}`).then(r => r.json())
    )
  );
  // Merge all events arrays into one combined JSON object
  const allEvents = [];
  results.forEach(r => {
    if (r.status === 'fulfilled') {
      allEvents.push(...(r.value?.events ?? []));
    }
  });
  return { events: allEvents };
}

export async function fetchScores(){
   
    const json = await fetchAllTournamentGames();
    const parsed = parseScoreboardData(json);

    return json;
  };

