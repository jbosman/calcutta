import React, { useState, useEffect, useCallback, useRef } from 'react';
import siteLogo from './assets/copa-america-logo.jpg';
import RegionBracket from './components/RegionBracket';
import FinalFourCenter from './components/FinalFourCenter';
import JsonEditor from './components/JsonEditor';
import { useBracket } from './hooks/useBracket';
import { useEspnScores, matchEspnScoresToBracket } from './hooks/useEspnScores';
import OwnerSummary from './components/OwnerSummary';
import TotalPotBanner from './components/TotalPotBanner';
import { getActiveRoundIndex } from './utils/currentRound';
import './styles/main.css';

const AUTO_REFRESH_MS = 60000; // 60 seconds

export default function App() {
  const { data, computed, updateScore, applyEspnScores, applyEspnScoresFull, resetBracket, exportJSON, importJSON } = useBracket();
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

  // Keep refs to the latest values so syncScores never captures a stale closure
  const computedRef = useRef(computed);
  const applyEspnScoresFull_ref = useRef(applyEspnScoresFull);
  useEffect(() => { computedRef.current = computed; }, [computed]);
  useEffect(() => { applyEspnScoresFull_ref.current = applyEspnScoresFull; }, [applyEspnScoresFull]);

  // Sync scores from ESPN. Uses applyEspnScoresFull which does both passes
  // (R1 scores → advance teams → R2+ scores) synchronously inside one state update.
  const syncScores = useCallback(async () => {
    const map = await fetchScores();
    if (!map) return;

    const newStatuses = {};
    Object.entries(map).forEach(([key, val]) => {
      newStatuses[key] = val.status;
    });

    // Pass 1 match uses current computed (R1 espnIds are always known)
    const enriched = JSON.parse(JSON.stringify(computedRef.current));
    const regions = ['east', 'west', 'south', 'midwest'];
    regions.forEach((region) => {
      ['r2', 'r3', 'r4'].forEach((round) => {
        computedRef.current.games[region][round].forEach((game, idx) => {
          enriched.games[region][round][idx].topTeamEspnId    = game.topTeam?.espnId ?? null;
          enriched.games[region][round][idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
        });
      });
    });
    computedRef.current.games.finalFour.forEach((game, idx) => {
      enriched.games.finalFour[idx].topTeamEspnId    = game.topTeam?.espnId ?? null;
      enriched.games.finalFour[idx].bottomTeamEspnId = game.bottomTeam?.espnId ?? null;
    });
    const ch = computedRef.current.games.championship[0];
    enriched.games.championship[0].topTeamEspnId    = ch.topTeam?.espnId ?? null;
    enriched.games.championship[0].bottomTeamEspnId = ch.bottomTeam?.espnId ?? null;

    const pass1Updates = matchEspnScoresToBracket(enriched, map);

    // applyEspnScoresFull does pass2 synchronously inside the same state update
    applyEspnScoresFull_ref.current(pass1Updates, newStatuses, map, matchEspnScoresToBracket);
  }, [fetchScores]);

  // Initial fetch on mount — runs two passes so that R1 results advance teams
  // into R2 and R2 scores are immediately applied without needing a manual sync.
  // Initial fetch on mount
  useEffect(() => {
    syncScores();
    // Sync scores and put the request on the event queue so it happens last
    // This second request is necessary to get all games data that is not retreived on the first request
    setTimeout(syncScores, 100 );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh interval — syncScores is stable so this never restarts unnecessarily
  useEffect(() => {
    if (!autoRefresh) return;
    const id = setInterval(syncScores, AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [autoRefresh, syncScores]);

  // Compute the active (first incomplete) round index per region for mobile tab default
  const activeRound = {
    east:    getActiveRoundIndex('east',    computed, getGameStatus),
    west:    getActiveRoundIndex('west',    computed, getGameStatus),
    south:   getActiveRoundIndex('south',   computed, getGameStatus),
    midwest: getActiveRoundIndex('midwest', computed, getGameStatus),
  };

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
          <RegionBracket region="EAST" regionKey="east" computed={computed} updateScore={updateScore} flipped={false} totalPot={totalPot} getGameStatus={getGameStatus} initialRound={activeRound.east} />
        </div>
        <div className="bracket-row single-region">
          <RegionBracket region="WEST" regionKey="west" computed={computed} updateScore={updateScore} flipped={true} totalPot={totalPot} getGameStatus={getGameStatus} initialRound={activeRound.west} />
        </div>
        <div className="bracket-row single-region">
          <RegionBracket region="SOUTH" regionKey="south" computed={computed} updateScore={updateScore} flipped={false} totalPot={totalPot} getGameStatus={getGameStatus} initialRound={activeRound.south} />
        </div>
        <div className="bracket-row single-region">
          <RegionBracket region="MIDWEST" regionKey="midwest" computed={computed} updateScore={updateScore} flipped={true} totalPot={totalPot} getGameStatus={getGameStatus} initialRound={activeRound.midwest} />
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
