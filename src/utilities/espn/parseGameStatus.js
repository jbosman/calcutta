// Normalise a game status from ESPN into something we can display
// Returns { state: 'pre'|'in'|'post', display: string }
export function parseStatus(competition) {
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

  // Pre-game — show scheduled date and tip time
  const dateStr = competition.date;
  if (dateStr) {
    try {
      const d = new Date(dateStr);
      const datePart = d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        timeZone: 'America/New_York',
      });
      // Midnight (00:00 ET) = ESPN placeholder meaning tip time is TBD — show date only
      const isTBD = d.toLocaleTimeString('en-US', {
        hour: 'numeric', minute: '2-digit',
        timeZone: 'America/New_York', hour12: false
      }) === '00:00';
      if (isTBD) {
        return { state: 'pre', display: datePart };
      }
      const timePart = d.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        timeZone: 'America/New_York',
        hour12: true,
      });
      return { state: 'pre', display: `${datePart} · ${timePart} ET` };
    } catch {
      return { state: 'pre', display: '' };
    }
  }

  return { state: 'pre', display: '' };
}

/**
 * Parse ESPN scoreboard JSON into a map of:
 *   espnTeamId (string) -> { status }
 */
export function parseGameStatuses(json){
  const statuses = {};
  
  Object.entries(parsed).forEach(([key, val]) => {
    statuses[key] = val.status;
  });

  return statuses;
}