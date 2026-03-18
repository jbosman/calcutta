import React, { useState } from 'react';
import siteLogo from './assets/copa-america-logo.jpg';
import RegionBracket from './components/RegionBracket';
import FinalFourCenter from './components/FinalFourCenter';
import JsonEditor from './components/JsonEditor';
import { useBracket } from './hooks/useBracket';
import OwnerSummary from './components/OwnerSummary';
import './styles/main.css';


export default function App() {
  const { data, computed, updateScore, resetBracket, exportJSON, importJSON } = useBracket();
  const [showJsonEditor, setShowJsonEditor] = useState(false);

  // Sum all team prices across all four regions
  const totalPot = Object.values(data.regions).reduce((sum, region) => {
    return sum + region.seeds.reduce((s, team) => s + (team.price || 0), 0);
  }, 0);

  // Count unique owners and total teams dynamically
  const uniqueOwners = new Set(
    Object.values(data.regions).flatMap(r => r.seeds.map(t => t.owner).filter(Boolean))
  );
  const totalTeams = Object.values(data.regions).reduce((n, r) => n + r.seeds.length, 0);

  return (
    <div className="app">
      {/* Header Card */}
      <div className="header-card">
        <div className="header-card-inner">
          <div className="header-left">
            <img src={siteLogo} alt="Copa America Logo" className="site-logo" />
            <div className="ncaa-badge">COPA AMERICA</div>
            <div className="header-text">
              <h1 className="bracket-title">Calcutta Tournament Bracket</h1>
              <div className="bracket-year">2025–26</div>
            </div>
          </div>
          <div className="header-actions">
          </div>
        </div>
        <div className="round-dates-bar">
          <span>1st Round: Mar 19–20</span>
          <span>2nd Round: Mar 21–22</span>
          <span>Sweet 16: Mar 26–27</span>
          <span>Elite 8: Mar 28–29</span>
          <span>Final Four: Apr 4</span>
          <span>Championship: Apr 6</span>
        </div>
      </div>

      {/* Bracket Layout */}
      <div className="bracket-wrapper">

        {/* TOTAL POT BANNER */}
        <div className="total-pot-banner">
          <div className="pot-left">
            <span className="pot-icon">💰</span>
            <span className="pot-label">Total Pot</span>
          </div>
          <div className="pot-amount">${totalPot.toLocaleString()}</div>
          <div className="pot-right">
            <span className="pot-subtitle">{totalTeams} teams · {uniqueOwners.size} owners</span>
          </div>
        </div>

        {/* Final Four + Championship — now at the top */}
        <FinalFourCenter computed={computed} updateScore={updateScore} totalPot={totalPot} />

        {/* EAST */}
        <div className="bracket-row single-region">
          <RegionBracket
            region="EAST"
            regionKey="east"
            computed={computed}
            updateScore={updateScore}
            flipped={false}
            totalPot={totalPot}
          />
        </div>

        {/* WEST */}
        <div className="bracket-row single-region">
          <RegionBracket
            region="WEST"
            regionKey="west"
            computed={computed}
            updateScore={updateScore}
            flipped={true}
            totalPot={totalPot}
          />
        </div>

        {/* SOUTH */}
        <div className="bracket-row single-region">
          <RegionBracket
            region="SOUTH"
            regionKey="south"
            computed={computed}
            updateScore={updateScore}
            flipped={false}
            totalPot={totalPot}
          />
        </div>

        {/* MIDWEST */}
        <div className="bracket-row single-region">
          <RegionBracket
            region="MIDWEST"
            regionKey="midwest"
            computed={computed}
            updateScore={updateScore}
            flipped={true}
            totalPot={totalPot}
          />
        </div>
      </div>

      {/* Owner Leaderboard */}
      <OwnerSummary computed={computed} totalPot={totalPot} />

      {/* JSON Editor Modal */}
      <JsonEditor
        isOpen={showJsonEditor}
        onClose={() => setShowJsonEditor(false)}
        jsonData={exportJSON()}
        onImport={importJSON}
      />
    </div>
  );
}
