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

export default function OwnerSummary({ computed, totalPot }) {
  const summaries = buildOwnerSummaries(computed, totalPot);
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
        {/* Table header */}
        <div className="owner-table-head">
          <div className="ot-col ot-rank">#</div>
          <div className="ot-col ot-name">Owner</div>
          <div className="ot-col ot-teams">Teams</div>
          <div className="ot-col ot-paid">Paid</div>
          <div className="ot-col ot-winnings">Winnings</div>
          <div className="ot-col ot-net">Net</div>
          <div className="ot-col ot-expand"></div>
        </div>

        {summaries.map((owner, rank) => {
          const isOpen = !!expanded[owner.owner];
          const hasActivity = owner.teams.some(t => t.roundsWon > 0 || t.eliminated);

          return (
            <div key={owner.owner} className={`owner-row-group ${rank === 0 && hasActivity ? 'owner-leader' : ''}`}>
              {/* Summary row */}
              <div className="owner-row" onClick={() => toggle(owner.owner)}>
                <div className="ot-col ot-rank">
                  {rank === 0 && hasActivity
                    ? <span className="rank-crown">👑</span>
                    : <span className="rank-num">{rank + 1}</span>
                  }
                </div>
                <div className="ot-col ot-name">
                  <span className="owner-name-text">{owner.owner}</span>
                  <span className="owner-team-count">{owner.teams.length} teams</span>
                </div>
                <div className="ot-col ot-teams">
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
                </div>
                <div className="ot-col ot-paid">{fmt(owner.totalPaid, false)}</div>
                <div className="ot-col ot-winnings">
                  {owner.totalWinnings > 0
                    ? <span className="winnings-val">{fmt(owner.totalWinnings, false)}</span>
                    : <span className="no-winnings">—</span>
                  }
                </div>
                <div className="ot-col ot-net">
                  <NetBadge value={owner.totalNet} />
                </div>
                <div className="ot-col ot-expand">
                  <span className={`expand-arrow ${isOpen ? 'open' : ''}`}>▾</span>
                </div>
              </div>

              {/* Expanded team detail */}
              {isOpen && (
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

                  {/* Owner totals footer */}
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
