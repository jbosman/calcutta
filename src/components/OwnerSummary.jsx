import React, { useState } from 'react';
import { buildOwnerSummaries, ROUND_NAMES } from '../utils/ownerSummary';

const REGION_COLORS = {
  east: 'var(--c-east)',
  west: 'var(--c-west)',
  south: 'var(--c-south)',
  midwest: 'var(--c-midwest)',
};

const REGION_LABELS = {
  east: 'E',
  west: 'W',
  south: 'S',
  midwest: 'MW',
};

function fmt(amount, showSign = true) {
  const abs = Math.abs(amount);
  const str = abs % 1 === 0 ? abs.toLocaleString() : abs.toFixed(2);
  if (!showSign) return `$${str}`;
  return amount < 0 ? `-$${str}` : `+$${str}`;
}

function NetBadge({ value }) {
  const isPos = value > 0;
  const isZero = value === 0;
  return (
    <span className={`net-badge ${isPos ? 'net-pos' : isZero ? 'net-zero' : 'net-neg'}`}>
      {fmt(value)}
    </span>
  );
}

function RoundDots({ roundsWon, eliminated }) {
  return (
    <div className="round-dots">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <span
          key={i}
          className={`round-dot ${i < roundsWon ? 'dot-won' : ''} ${eliminated && i === roundsWon ? 'dot-lost' : ''}`}
          title={ROUND_NAMES[i]}
        />
      ))}
    </div>
  );
}

function GameStatusPill({ gameInfo, eliminated }) {
  if (!gameInfo || eliminated) return null;
  const { gameStatus, myScore, oppScore, opponent } = gameInfo;
  if (!gameStatus) return null;

  const { state, display } = gameStatus;
  const oppName = opponent?.abbr || opponent?.team || '?';

  if (state === 'post') {
    const won = myScore > oppScore;
    const lost = myScore < oppScore;
    return (
      <span className={`game-pill game-pill-post ${won ? 'pill-won' : lost ? 'pill-lost' : ''}`}>
        {won ? '✓' : '✗'} {myScore}–{oppScore} vs {oppName} · Final
      </span>
    );
  }

  if (state === 'in') {
    const leading = myScore !== null && oppScore !== null && myScore > oppScore;
    const trailing = myScore !== null && oppScore !== null && myScore < oppScore;
    return (
      <span className={`game-pill game-pill-live ${leading ? 'pill-leading' : trailing ? 'pill-trailing' : ''}`}>
        <span className="pill-live-dot" />
        {myScore ?? '–'}–{oppScore ?? '–'} vs {oppName} · {display}
      </span>
    );
  }

  return (
    <span className="game-pill game-pill-pre">
      vs {oppName} · {display}
    </span>
  );
}

export default function OwnerSummary({ computed, totalPot, getGameStatus }) {
  const summaries = buildOwnerSummaries(computed, totalPot, getGameStatus);
  const [expanded, setExpanded] = useState({});

  function toggle(owner) {
    setExpanded(prev => ({ ...prev, [owner]: !prev[owner] }));
  }

  return (
    <div className="owner-summary-section">
      <div className="owner-summary-header">
        <div className="owner-summary-title">
          <span className="summary-icon">🏅</span>
          <span>Owner Leaderboard</span>
        </div>
        <div className="owner-summary-subtitle">
          {summaries.length} owners · updates live as teams advance
        </div>
      </div>

      <div className="owner-table-wrap">
        <table className="owner-table">
          <thead>
            <tr>
              <th className="ot-rank">#</th>
              <th className="ot-name">Owner</th>
              <th className="ot-teams">Teams</th>
              <th className="ot-paid">Paid</th>
              <th className="ot-winnings">Winnings</th>
              <th className="ot-net">Net</th>
              <th className="ot-expand"></th>
            </tr>
          </thead>

          {summaries.map((owner, rank) => {
            const isOpen = !!expanded[owner.owner];
            const hasActivity = owner.teams.some(t => t.roundsWon > 0 || t.eliminated);
            const isLeader = rank === 0 && hasActivity;

            return (
              <tbody key={owner.owner} className={`owner-tbody ${isLeader ? 'owner-leader' : ''}`}>
                {/* Main row */}
                <tr className="owner-row" onClick={() => toggle(owner.owner)}>
                  <td className="ot-rank">
                    {isLeader
                      ? <span className="rank-crown">👑</span>
                      : <span className="rank-num">{rank + 1}</span>
                    }
                  </td>
                  <td className="ot-name">
                    <span className="owner-name-text">{owner.owner}</span>
                    <span className="owner-team-count">{owner.teams.length} teams</span>
                  </td>
                  <td className="ot-teams">
                    <div className="owner-team-chips">
                      {owner.teams.map(t => (
                        <span
                          key={t.team}
                          className={`team-chip ${t.eliminated ? 'chip-eliminated' : t.roundsWon > 0 ? 'chip-winning' : 'chip-neutral'}`}
                          style={{ '--chip-color': REGION_COLORS[t.region] }}
                          title={`${t.team} (${t.region}, seed ${t.seed})`}
                        >
                          <span className="chip-region">{REGION_LABELS[t.region]}{t.seed}</span>
                          <span className="chip-name">{t.abbr}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="ot-paid">{fmt(owner.totalPaid, false)}</td>
                  <td className="ot-winnings">
                    {owner.totalWinnings > 0
                      ? <span className="winnings-val">{fmt(owner.totalWinnings, false)}</span>
                      : <span className="no-winnings">—</span>
                    }
                  </td>
                  <td className="ot-net">
                    <NetBadge value={owner.totalNet} />
                  </td>
                  <td className="ot-expand">
                    <span className={`expand-arrow ${isOpen ? 'open' : ''}`}>▾</span>
                  </td>
                </tr>

                {/* Mobile chips row — shown only on small screens */}
                <tr className="owner-row-chips-mobile" onClick={() => toggle(owner.owner)}>
                  <td colSpan={7} className="ot-chips-cell">
                    <div className="owner-team-chips">
                      {owner.teams.map(t => (
                        <span
                          key={t.team}
                          className={`team-chip ${t.eliminated ? 'chip-eliminated' : t.roundsWon > 0 ? 'chip-winning' : 'chip-neutral'}`}
                          style={{ '--chip-color': REGION_COLORS[t.region] }}
                          title={`${t.team} (${t.region}, seed ${t.seed})`}
                        >
                          <span className="chip-name">{t.abbr}</span>
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>

                {/* Expanded detail panel */}
                {isOpen && (
                  <tr className="owner-detail-row">
                    <td colSpan={7} className="owner-detail-cell">
                      <div className="owner-detail">
                        <div className="detail-team-list">
                          {owner.teams.map(t => (
                            <div key={t.team} className={`detail-team-row ${t.eliminated ? 'detail-elim' : t.roundsWon > 0 ? 'detail-active' : ''}`}>
                              <div className="detail-team-left">
                                <span
                                  className="detail-region-badge"
                                  style={{ background: REGION_COLORS[t.region] }}
                                >
                                  {REGION_LABELS[t.region]}{t.seed}
                                </span>
                                {t.espnId && (
                                  <img
                                    className="detail-team-logo"
                                    src={`https://a.espncdn.com/i/teamlogos/ncaa/500/${t.espnId}.png`}
                                    alt={t.team}
                                    onError={(e) => { e.target.style.display = 'none'; }}
                                  />
                                )}
                                <div className="detail-team-info">
                                  <span className="detail-team-name">{t.team}</span>
                                  <span className="detail-status">{t.status}</span>
                                  <GameStatusPill gameInfo={t.gameInfo} eliminated={t.eliminated} />
                                </div>
                              </div>
                              <div className="detail-team-right">
                                <RoundDots roundsWon={t.roundsWon} eliminated={t.eliminated} />
                                <div className="detail-financials">
                                  <span className="detail-paid">Paid: {fmt(t.price, false)}</span>
                                  {t.winnings > 0 && (
                                    <span className="detail-earned">Won: {fmt(t.winnings, false)}</span>
                                  )}
                                  <NetBadge value={t.net} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="detail-totals">
                          <span className="detail-totals-label">Totals</span>
                          <div className="detail-totals-right">
                            <span className="detail-paid">Paid: {fmt(owner.totalPaid, false)}</span>
                            {owner.totalWinnings > 0 && (
                              <span className="detail-earned">Won: {fmt(owner.totalWinnings, false)}</span>
                            )}
                            <NetBadge value={owner.totalNet} />
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            );
          })}
        </table>
      </div>
    </div>
  );
}
