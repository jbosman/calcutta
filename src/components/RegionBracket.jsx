import React, { useState } from 'react';
import Matchup from './Matchup';
import { cumulativePct, formatPct, dollarsEarned } from '../utils/payouts';

// roundIndex: 0=R1, 1=R2, 2=S16, 3=E8
const ROUND_LABELS = ['1st Round', '2nd Round', 'Sweet 16', 'Elite 8'];
const ROUND_SHORT  = ['R1', 'R2', 'S16', 'E8'];
const ROUND_DATES  = ['Mar 19-20', 'Mar 21-22', 'Mar 26-27', 'Mar 28-29'];

export default function RegionBracket({ region, regionKey, computed, updateScore, flipped = false, totalPot = 0 }) {
  const seeds = computed.regions[regionKey].seeds;
  const games = computed.games[regionKey];
  const rounds = ['r1', 'r2', 'r3', 'r4'];
  const [mobileRound, setMobileRound] = useState(0);

  function getTopTeam(round, gameIdx) {
    if (round === 'r1') return seeds[games.r1[gameIdx].top];
    return games[round][gameIdx].topTeam || null;
  }

  function getBottomTeam(round, gameIdx) {
    if (round === 'r1') return seeds[games.r1[gameIdx].bottom];
    return games[round][gameIdx].bottomTeam || null;
  }

  function roundHeader(rIdx) {
    const pct = cumulativePct(rIdx);
    const potAmt = dollarsEarned(rIdx, totalPot);
    const potStr = potAmt % 1 === 0 ? potAmt.toLocaleString() : potAmt.toFixed(2);
    return (
      <div className="round-header">
        <div className="round-label">{ROUND_LABELS[rIdx]}</div>
        <div className="round-date">{ROUND_DATES[rIdx]}</div>
        <div className="round-payout">
          <span className="payout-pct">{formatPct(pct)}</span>
          <span className="payout-amt"> = ${potStr}</span>
        </div>
      </div>
    );
  }

  // Desktop: all 4 round columns side by side
  const roundColumns = rounds.map((round, rIdx) => {
    const roundGames = games[round];
    return (
      <div key={round} className="round-column">
        {roundHeader(rIdx)}
        <div className={`round-games round-${rIdx}`}>
          {roundGames.map((game, gIdx) => (
            <div key={game.id} className="game-wrapper">
              <Matchup
                topTeam={getTopTeam(round, gIdx)}
                bottomTeam={getBottomTeam(round, gIdx)}
                topScore={game.topScore}
                bottomScore={game.bottomScore}
                onTopScoreChange={(val) => updateScore(regionKey, round, gIdx, 'top', val)}
                onBottomScoreChange={(val) => updateScore(regionKey, round, gIdx, 'bottom', val)}
                roundIndex={rIdx}
                totalPot={totalPot}
              />
            </div>
          ))}
        </div>
      </div>
    );
  });

  // Mobile: single round panel with tab switcher
  const mobileRoundKey = rounds[mobileRound];
  const mobileGames = games[mobileRoundKey];

  return (
    <div className={`region-bracket ${flipped ? 'region-flipped' : ''}`} data-region={regionKey}>
      <div className="region-label-bar">
        <span className="region-name">{region}</span>
      </div>

      {/* Desktop layout */}
      <div className="region-rounds desktop-rounds">
        {flipped ? [...roundColumns].reverse() : roundColumns}
      </div>

      {/* Mobile layout */}
      <div className="mobile-rounds">
        <div className="mobile-round-tabs">
          {ROUND_SHORT.map((label, i) => {
            const pct = cumulativePct(i);
            return (
              <button
                key={i}
                className={`mobile-round-tab ${mobileRound === i ? 'active' : ''}`}
                onClick={() => setMobileRound(i)}
              >
                <span className="tab-short">{label}</span>
                <span className="tab-date">{ROUND_DATES[i]}</span>
                <span className="tab-pct">{formatPct(pct)}</span>
              </button>
            );
          })}
        </div>
        <div className="mobile-round-panel">
          <div className="mobile-round-title">
            {ROUND_LABELS[mobileRound]}
            <span className="mobile-round-pct"> &mdash; {formatPct(cumulativePct(mobileRound))} of pot = ${dollarsEarned(mobileRound, totalPot).toLocaleString()}</span>
          </div>
          <div className="mobile-games-grid">
            {mobileGames.map((game, gIdx) => (
              <div key={game.id} className="mobile-game-wrapper">
                <Matchup
                  topTeam={getTopTeam(mobileRoundKey, gIdx)}
                  bottomTeam={getBottomTeam(mobileRoundKey, gIdx)}
                  topScore={game.topScore}
                  bottomScore={game.bottomScore}
                  onTopScoreChange={(val) => updateScore(regionKey, mobileRoundKey, gIdx, 'top', val)}
                  onBottomScoreChange={(val) => updateScore(regionKey, mobileRoundKey, gIdx, 'bottom', val)}
                  roundIndex={mobileRound}
                  totalPot={totalPot}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
