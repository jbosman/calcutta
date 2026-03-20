import React from 'react';

export default function TotalPotBanner({ totalPot, totalTeams, uniqueOwnersCount }) {
  return (
    <div className="total-pot-banner">
      <div className="pot-left">
        <span className="pot-icon">💰</span>
        <span className="pot-label">Total Pot</span>
      </div>
      <div className="pot-amount">${totalPot.toLocaleString()}</div>
      <div className="pot-right">
        <span className="pot-subtitle">{totalTeams} teams · {uniqueOwnersCount} owners</span>
      </div>
    </div>
  );
}
