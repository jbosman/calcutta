import React, { useState, useEffect, useCallback } from 'react';
import siteLogo from './assets/copa-america-logo.jpg';
import RegionBracket from './components/RegionBracket';
import FinalFourCenter from './components/FinalFourCenter';
import JsonEditor from './components/JsonEditor';
import { useBracket } from './hooks/useBracket';
import { useEspnScores } from './hooks/useEspnScores';
import OwnerSummary from './components/OwnerSummary';
import './styles/main.css';

const AUTO_REFRESH_MS = 60000; // 60 seconds

export default function App() {
  const { data, computed, updateScore, applyEspnScores, resetBracket, exportJSON, importJSON } = useBracket();
  const { fetchScores, loading, error, lastUpdated, getScoreUpdates, getGameStatus, gameMap } = useEspnScores();
  const [showJsonEditor, setShowJsonEditor] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const totalPot = Object.values(data.regions).reduce((sum, region) => {
    return sum + region.seeds.reduce((s, team) => s + (team.price || 0), 0);
  }, 0);

  const uniqueOwners = new Set(
    Object.values(data.regions).flatMap(r => r.seeds.map(t => t.owner).filter(Boolean))
  );
  const totalTeams = Object.values(data.regions).reduce((n, r) => n + r.seeds.length, 0);

  // Sync scores from ESPN and apply to bracket
  const syncScores = useCallback(async () => {
    const map = await fetchScores();
    if (!map) return;

    // Build enriched bracket with espnIds for advanced-round teams from computed
    const enriched = JSON.parse(JSON.stringify(data));
    const regions = ['east', 'west', 'south', 'midwest'];
    regions.forEach((region) => {
      ['r2', 'r3', 'r4'].forEach((round) => {
        computed.games[region][round].forEach((game, idx) => {
          enriched.games[region][round][idx].topTeamEspnId = game.topTeam?.espnId ?? null;
          enriched.games[region][round][idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
        });
      });
    });
    computed.games.finalFour.forEach((game, idx) => {
      enriched.games.finalFour[idx].topTeamEspnId = game.topTeam?.espnId ?? null;
      enriched.games.finalFour[idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
    });
    const ch = computed.games.championship[0];
    enriched.games.championship[0].topTeamEspnId = ch.topTeam?.espnId ?? null;
    enriched.games.championship[0].bottomTeamEspnId = ch.bottomTeam?.espnId ?? null;

    // Import from useEspnScores matchEspnScoresToBracket
    const { matchEspnScoresToBracket } = await import('./hooks/useEspnScores.js');
    const updates = matchEspnScoresToBracket(enriched, map);

    // Build status map keyed by game id using espnId pair
    const newStatuses = {};
    Object.entries(map).forEach(([key, val]) => {
      newStatuses[key] = val.status;
    });

    applyEspnScores(updates, newStatuses);
  }, [fetchScores, data, computed, applyEspnScores]);

  // Initial fetch on mount
  useEffect(() => {
    syncScores();
  }, []);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(syncScores, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, syncScores]);

  const formatLastUpdated = (date) => {
    if (!date) return null;
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', second: '2-digit' });
  };

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
            {/* ESPN Live Sync controls */}
            <div className="sync-controls">
              <button
                className={`btn btn-sync ${loading ? 'btn-sync-loading' : ''}`}
                onClick={syncScores}
                disabled={loading}
                title="Fetch latest scores from ESPN"
              >
                <span className={`sync-icon ${loading ? 'spinning' : ''}`}>↻</span>
                {loading ? 'Syncing…' : 'Sync Scores'}
              </button>
              <button
                className={`btn btn-auto ${autoRefresh ? 'btn-auto-on' : 'btn-auto-off'}`}
                onClick={() => setAutoRefresh(v => !v)}
                title={autoRefresh ? 'Auto-refresh is ON (every 60s) — click to disable' : 'Auto-refresh is OFF — click to enable'}
              >
                {autoRefresh ? '⏱ Auto ON' : '⏱ Auto OFF'}
              </button>
            </div>
            {lastUpdated && (
              <div className="sync-status">
                {error
                  ? <span className="sync-error">⚠ {error}</span>
                  : <span className="sync-time">Updated {formatLastUpdated(lastUpdated)}</span>
                }
              </div>
            )}
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

        <div className="bracket-row single-region">
          <RegionBracket region="EAST" regionKey="east" computed={computed} updateScore={updateScore} flipped={false} totalPot={totalPot} getGameStatus={getGameStatus} />
        </div>
        <div className="bracket-row single-region">
          <RegionBracket region="WEST" regionKey="west" computed={computed} updateScore={updateScore} flipped={true} totalPot={totalPot} getGameStatus={getGameStatus} />
        </div>
        <div className="bracket-row single-region">
          <RegionBracket region="SOUTH" regionKey="south" computed={computed} updateScore={updateScore} flipped={false} totalPot={totalPot} getGameStatus={getGameStatus} />
        </div>
        <div className="bracket-row single-region">
          <RegionBracket region="MIDWEST" regionKey="midwest" computed={computed} updateScore={updateScore} flipped={true} totalPot={totalPot} getGameStatus={getGameStatus} />
        </div>
      </div>

      <FinalFourCenter computed={computed} updateScore={updateScore} totalPot={totalPot} getGameStatus={getGameStatus} />
      <OwnerSummary computed={computed} totalPot={totalPot} getGameStatus={getGameStatus} />

      <JsonEditor
        isOpen={showJsonEditor}
        onClose={() => setShowJsonEditor(false)}
        jsonData={exportJSON()}
        onImport={importJSON}
      />
    </div>
  );
}
