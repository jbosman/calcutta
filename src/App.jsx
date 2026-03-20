import React, { useState, useEffect, useCallback, useRef } from 'react';
import siteLogo from './assets/copa-america-logo.jpg';
import RegionBracket from './components/RegionBracket';
import FinalFourCenter from './components/FinalFourCenter';
import JsonEditor from './components/JsonEditor';
import { useBracket } from './hooks/useBracket';
import { useEspnScores, matchEspnScoresToBracket } from './hooks/useEspnScores';
import OwnerSummary from './components/OwnerSummary';
import TotalPotBanner from './components/TotalPotBanner';
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

  // Keep refs to the latest computed and applyEspnScores so syncScores
  // never captures a stale closure — important for the auto-refresh interval
  const computedRef = useRef(computed);
  const applyRef = useRef(applyEspnScores);
  useEffect(() => { computedRef.current = computed; }, [computed]);
  useEffect(() => { applyRef.current = applyEspnScores; }, [applyEspnScores]);

  // Sync scores from ESPN and apply to bracket
  const syncScores = useCallback(async () => {
    const map = await fetchScores();
    if (!map) return;

    const currentComputed = computedRef.current;

    // Build enriched bracket using the current computed state (which has games)
    // Annotate R2+ slots with the espnIds of teams that have already advanced
    const enriched = JSON.parse(JSON.stringify(currentComputed));
    const regions = ['east', 'west', 'south', 'midwest'];
    regions.forEach((region) => {
      ['r2', 'r3', 'r4'].forEach((round) => {
        currentComputed.games[region][round].forEach((game, idx) => {
          enriched.games[region][round][idx].topTeamEspnId = game.topTeam?.espnId ?? null;
          enriched.games[region][round][idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
        });
      });
    });
    currentComputed.games.finalFour.forEach((game, idx) => {
      enriched.games.finalFour[idx].topTeamEspnId = game.topTeam?.espnId ?? null;
      enriched.games.finalFour[idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
    });
    const ch = currentComputed.games.championship[0];
    enriched.games.championship[0].topTeamEspnId = ch.topTeam?.espnId ?? null;
    enriched.games.championship[0].bottomTeamEspnId = ch.bottomTeam?.espnId ?? null;

    const updates = matchEspnScoresToBracket(enriched, map);

    const newStatuses = {};
    Object.entries(map).forEach(([key, val]) => {
      newStatuses[key] = val.status;
    });

    applyRef.current(updates, newStatuses);
  }, [fetchScores]); // fetchScores is stable; computed/apply accessed via refs

  // Initial fetch on mount — runs exactly once
  useEffect(() => {
    syncScores();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh interval — syncScores is stable so this never restarts unnecessarily
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

      <TotalPotBanner
        totalPot={totalPot}
        totalTeams={totalTeams}
        uniqueOwnersCount={uniqueOwners.size}
      />

      <OwnerSummary computed={computed} totalPot={totalPot} getGameStatus={getGameStatus} />

      {/* Bracket Layout */}
      <div className="bracket-wrapper">

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

      <JsonEditor
        isOpen={showJsonEditor}
        onClose={() => setShowJsonEditor(false)}
        jsonData={exportJSON()}
        onImport={importJSON}
      />
    </div>
  );
}
