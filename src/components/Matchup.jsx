import React, { useState } from 'react';
import { dollarsEarned } from '../utils/payouts';

function TeamLogo({ espnId, teamName }) {
  const [errored, setErrored] = useState(false);
  if (!espnId || errored) {
    return (
      <div className="team-logo team-logo-fallback" title={teamName}>
        {(teamName || '?').charAt(0)}
      </div>
    );
  }
  return (
    <img
      className="team-logo"
      src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${espnId}.png`}
      alt={teamName}
      title={teamName}
      onError={() => setErrored(true)}
    />
  );
}

function TeamSlot({ team, score, isWinner, isLoser, isFinal, roundIndex, totalPot }) {
  const isEmpty = !team;
  const seedNum = team?.seed;
  const teamName = team?.team || 'TBD';
  const ownerName = team?.owner || '';
  const price = team?.price ?? null;
  const espnId = team?.espnId ?? null;

  const hasValue = !isEmpty && roundIndex !== undefined && roundIndex !== null && totalPot > 0;

  // Earnings already accumulated by reaching this round (won rounds 0..roundIndex-1)
  const earnedToDate = hasValue && roundIndex > 0 ? dollarsEarned(roundIndex - 1, totalPot) : 0;
  // Earnings if they win this round
  const earnedIfWin = hasValue ? dollarsEarned(roundIndex, totalPot) : 0;

  // Net display logic:
  // - Before final: current value = earnedToDate - price (what they're worth right now)
  // - After final, winner: earnedIfWin - price
  // - After final, loser: earnedToDate - price (they stop here)
  let displayNet = null;
  if (hasValue && price !== null) {
    if (!isFinal) {
      displayNet = earnedToDate - price;
    } else if (isWinner) {
      displayNet = earnedIfWin - price;
    } else {
      displayNet = earnedToDate - price;
    }
  }

  const fmtNet = (n) => {
    const abs = Math.abs(n);
    const str = abs % 1 === 0 ? abs.toLocaleString() : abs.toFixed(2);
    return (n >= 0 ? '+' : '-') + '$' + str;
  };

  return (
    <div className={`team-slot ${isWinner ? 'winner' : ''} ${isLoser ? 'loser' : ''} ${isEmpty ? 'empty' : ''}`}>
      <div className="team-info">
        {!isEmpty && <span className="seed-badge">{seedNum}</span>}
        {!isEmpty && <TeamLogo espnId={espnId} teamName={teamName} />}
        <div className="team-details">
          <span className="team-name" title={teamName}>{isEmpty ? 'TBD' : teamName}</span>
          {(ownerName || price !== null) && (
            <span className="owner-name">
              {ownerName}
              {ownerName && price !== null ? ' · ' : ''}
              {price !== null ? `$${price}` : ''}
            </span>
          )}
          {displayNet !== null && (
            <span className={`round-net ${displayNet >= 0 ? 'round-net-pos' : 'round-net-neg'}`}>
              {fmtNet(displayNet)}
            </span>
          )}
        </div>
      </div>
      <div className="score-area">
        {!isEmpty && (
          <span className={`score-display ${isWinner ? 'score-winner' : ''} ${score === null ? 'score-empty' : ''}`}>
            {score !== null ? score : '—'}
          </span>
        )}
      </div>
    </div>
  );
}

function GameStatusBadge({ status, roundDate }) {
  if (status) {
    const { state, display } = status;
    if (!display) return null;
    return (
      <div className={`game-status-badge status-${state}`}>
        {state === 'in' && <span className="live-dot" />}
        {display}
      </div>
    );
  }
  if (roundDate) {
    return (
      <div className="game-status-badge status-pre">
        {roundDate}
      </div>
    );
  }
  return null;
}

export default function Matchup({
  topTeam,
  bottomTeam,
  topScore,
  bottomScore,
  roundIndex,
  totalPot = 0,
  compact = false,
  gameStatus = null,
  roundDate = null,
}) {
  const topWins = topScore !== null && bottomScore !== null && topScore > bottomScore;
  const bottomWins = topScore !== null && bottomScore !== null && bottomScore > topScore;
  const isFinal = gameStatus?.state === 'post' || (topWins || bottomWins && !gameStatus);
  const gameDecided = topWins || bottomWins;

  return (
    <div className={`matchup ${compact ? 'matchup-compact' : ''}`}>
      {(gameStatus || (roundDate && !gameDecided)) &&
        <GameStatusBadge status={gameStatus} roundDate={!gameDecided ? roundDate : null} />}
      <TeamSlot
        team={topTeam}
        score={topScore}
        isWinner={topWins}
        isLoser={bottomWins}
        isFinal={isFinal}
        roundIndex={roundIndex}
        totalPot={totalPot}
      />
      <div className="matchup-divider" />
      <TeamSlot
        team={bottomTeam}
        score={bottomScore}
        isWinner={bottomWins}
        isLoser={topWins}
        isFinal={isFinal}
        roundIndex={roundIndex}
        totalPot={totalPot}
      />
    </div>
  );
}
