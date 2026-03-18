import React from 'react';
import Matchup from './Matchup';
import { cumulativePct, formatPct, dollarsEarned } from '../utils/payouts';

const FF_ROUND_INDEX = 4;
const CH_ROUND_INDEX = 5;

function fmtAmt(roundIndex, totalPot) {
  const amt = dollarsEarned(roundIndex, totalPot);
  return amt % 1 === 0 ? amt.toLocaleString() : amt.toFixed(2);
}

export default function FinalFourCenter({ computed, updateScore, totalPot = 0 }) {
  const ff = computed.games.finalFour;
  const ch = computed.games.championship[0];
  const champion = ch.champion || null;

  return (
    <div className="final-four-center">
      <div className="ff-inner">

        {/* Final Four Game 1: East vs West */}
        <div className="ff-section">
          <div className="ff-round-header">
            <div className="round-label">Final Four</div>
            <div className="round-date">Apr 4</div>
            <div className="round-payout">
              <span className="payout-pct">{formatPct(cumulativePct(FF_ROUND_INDEX))}</span>
              <span className="payout-amt"> = ${fmtAmt(FF_ROUND_INDEX, totalPot)}</span>
            </div>
          </div>
          <div className="ff-game">
            <Matchup
              topTeam={ff[0].topTeam || null}
              bottomTeam={ff[0].bottomTeam || null}
              topScore={ff[0].topScore}
              bottomScore={ff[0].bottomScore}
              onTopScoreChange={(val) => updateScore('finalFour', null, 0, 'top', val)}
              onBottomScoreChange={(val) => updateScore('finalFour', null, 0, 'bottom', val)}
              roundIndex={FF_ROUND_INDEX}
              totalPot={totalPot}
            />
          </div>
          <div className="ff-matchup-label">East vs West</div>
        </div>

        {/* Championship */}
        <div className="championship-section">
          <div className="championship-header">
            <div className="trophy-icon">🏆</div>
            <div className="ch-round-label">Championship</div>
            <div className="round-date">Apr 6</div>
            <div className="round-payout ch-payout">
              <span className="payout-pct">{formatPct(cumulativePct(CH_ROUND_INDEX))}</span>
              <span className="payout-amt"> = ${fmtAmt(CH_ROUND_INDEX, totalPot)}</span>
            </div>
          </div>
          <div className="ch-game">
            <Matchup
              topTeam={ch.topTeam || null}
              bottomTeam={ch.bottomTeam || null}
              topScore={ch.topScore}
              bottomScore={ch.bottomScore}
              onTopScoreChange={(val) => updateScore('championship', null, 0, 'top', val)}
              onBottomScoreChange={(val) => updateScore('championship', null, 0, 'bottom', val)}
              roundIndex={CH_ROUND_INDEX}
              totalPot={totalPot}
            />
          </div>
          {champion && (
            <div className="champion-display">
              <div className="champion-label">CHAMPION</div>
              <div className="champion-name">{champion.team}</div>
              <div className="champion-owner">Owner: {champion.owner}</div>
            </div>
          )}
        </div>

        {/* Final Four Game 2: South vs Midwest */}
        <div className="ff-section">
          <div className="ff-round-header">
            <div className="round-label">Final Four</div>
            <div className="round-date">Apr 4</div>
            <div className="round-payout">
              <span className="payout-pct">{formatPct(cumulativePct(FF_ROUND_INDEX))}</span>
              <span className="payout-amt"> = ${fmtAmt(FF_ROUND_INDEX, totalPot)}</span>
            </div>
          </div>
          <div className="ff-game">
            <Matchup
              topTeam={ff[1].topTeam || null}
              bottomTeam={ff[1].bottomTeam || null}
              topScore={ff[1].topScore}
              bottomScore={ff[1].bottomScore}
              onTopScoreChange={(val) => updateScore('finalFour', null, 1, 'top', val)}
              onBottomScoreChange={(val) => updateScore('finalFour', null, 1, 'bottom', val)}
              roundIndex={FF_ROUND_INDEX}
              totalPot={totalPot}
            />
          </div>
          <div className="ff-matchup-label">South vs Midwest</div>
        </div>

      </div>
    </div>
  );
}
