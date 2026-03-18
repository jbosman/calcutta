// Payout percentages earned by WINNING each round (as decimals)
// roundIndex: 0=R1, 1=R2, 2=S16, 3=E8, 4=FF, 5=Championship
export const ROUND_WIN_PCT = [0.01, 0.015, 0.02, 0.04, 0.04, 0.04];

// Cumulative % earned if a team has won rounds 0 through roundIndex (inclusive)
export function cumulativePct(throughRoundIndex) {
  let total = 0;
  for (let i = 0; i <= throughRoundIndex; i++) total += ROUND_WIN_PCT[i];
  return total;
}

// Dollar amount earned for winning through a given round
export function dollarsEarned(throughRoundIndex, totalPot) {
  return cumulativePct(throughRoundIndex) * totalPot;
}

// Net profit = dollars earned - price paid
export function netProfit(throughRoundIndex, totalPot, pricePaid) {
  return dollarsEarned(throughRoundIndex, totalPot) - (pricePaid || 0);
}

// Format as $X or -$X with no unnecessary decimals
export function formatDollars(amount) {
  const abs = Math.abs(amount);
  const formatted = abs % 1 === 0 ? abs.toLocaleString() : abs.toFixed(2);
  return amount < 0 ? `-$${formatted}` : `+$${formatted}`;
}

// Cumulative % as a display string e.g. "2.5%"
export function formatPct(pct) {
  const val = pct * 100;
  return (val % 1 === 0 ? val.toString() : val.toFixed(1)) + '%';
}
