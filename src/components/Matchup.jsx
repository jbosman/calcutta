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

function TeamSlot({ team, score, isWinner, isLoser, onScoreChange, roundIndex, totalPot }) {
  const isEmpty = !team;
  const seedNum = team?.seed;
  const teamName = team?.team || 'TBD';
  const ownerName = team?.owner || '';
  const price = team?.price ?? null;
  const espnId = team?.espnId ?? null;

  const showEarnings = isWinner && roundIndex !== undefined && roundIndex !== null && totalPot > 0;
  const earned = showEarnings ? dollarsEarned(roundIndex, totalPot) : null;
  const net = showEarnings && price !== null ? earned - price : null;

  const formatNet = (n) => {
    const abs = Math.abs(n);
    const str = abs % 1 === 0 ? abs.toLocaleString() : abs.toFixed(2);
    return n < 0 ? `-$${str}` : `+$${str}`;
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
              {net !== null && (
                <span className={`net-profit ${net >= 0 ? 'profit-positive' : 'profit-negative'}`}>
                  {' '}({formatNet(net)})
                </span>
              )}
            </span>
          )}
        </div>
      </div>
      <div className="score-area">
        {!isEmpty && (
          <input
            type="number"
            className={`score-input ${isWinner ? 'score-winner' : ''}`}
            value={score === null || score === undefined ? '' : score}
            onChange={(e) => onScoreChange(e.target.value)}
            placeholder="—"
            min="0"
            max="200"
            disabled
          />
        )}
      </div>
    </div>
  );
}

export default function Matchup({
  topTeam,
  bottomTeam,
  topScore,
  bottomScore,
  onTopScoreChange,
  onBottomScoreChange,
  roundIndex,
  totalPot = 0,
  compact = false,
}) {
  const topWins = topScore !== null && bottomScore !== null && topScore > bottomScore;
  const bottomWins = topScore !== null && bottomScore !== null && bottomScore > topScore;

  return (
    <div className={`matchup ${compact ? 'matchup-compact' : ''}`}>
      <TeamSlot
        team={topTeam}
        score={topScore}
        isWinner={topWins}
        isLoser={bottomWins}
        onScoreChange={onTopScoreChange}
        roundIndex={roundIndex}
        totalPot={totalPot}
      />
      <div className="matchup-divider" />
      <TeamSlot
        team={bottomTeam}
        score={bottomScore}
        isWinner={bottomWins}
        isLoser={topWins}
        onScoreChange={onBottomScoreChange}
        roundIndex={roundIndex}
        totalPot={totalPot}
      />
    </div>
  );
}
