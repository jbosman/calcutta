import React, { useState, useEffect, useRef, useCallback } from 'react';
import Matchup from './Matchup';
import { cumulativePct, formatPct, dollarsEarned } from '../utils/payouts';

const ROUND_LABELS = ['1st Round', '2nd Round', 'Sweet 16', 'Elite 8'];
const ROUND_SHORT  = ['R1', 'R2', 'S16', 'E8'];
const ROUND_DATES  = ['Mar 19-20', 'Mar 21-22', 'Mar 26-27', 'Mar 28-29'];
const CONN_W = 20;

// Returns Y position of the .matchup-divider inside each child of listEl,
// relative to ancestorEl's top. Falls back to child midpoint if no divider found.
function getMidpoints(listEl, ancestorEl) {
  if (!listEl || !ancestorEl) return [];
  const base = ancestorEl.getBoundingClientRect().top;
  return Array.from(listEl.children).map(c => {
    const divider = c.querySelector('.matchup-divider');
    const target  = divider ?? c;
    const r = target.getBoundingClientRect();
    return r.top - base + r.height / 2;
  });
}

// Draws bracket connector SVG. Position:absolute so it never affects layout.
function ConnectorSVG({ leftMids, targetMids }) {
  if (!leftMids.length || !targetMids.length) return null;
  const paths = [];
  const xM = CONN_W / 2;

  for (let r = 0; r < targetMids.length; r++) {
    const ly1 = leftMids[r * 2];
    const ly2 = leftMids[r * 2 + 1];
    const ry  = targetMids[r];
    if (ly1 == null || ly2 == null || isNaN(ly1) || isNaN(ly2)) continue;
    paths.push(`M 0 ${ly1} H ${xM}`);
    paths.push(`M 0 ${ly2} H ${xM}`);
    paths.push(`M ${xM} ${ly1} V ${ly2}`);
    paths.push(`M ${xM} ${ry} H ${CONN_W}`);
  }

  const maxY = Math.max(...leftMids, ...targetMids) + 4;
  return (
    <svg width={CONN_W} height={maxY}
      style={{ position: 'absolute', top: 0, left: 0, overflow: 'visible', pointerEvents: 'none' }}>
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="var(--c-border)" strokeWidth="1.5"
              fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

// Manages a connector + its right column.
// Measures left column card midpoints, computes target Ys for right cards,
// exposes those targets so right cards can be absolutely positioned to match.
function useBracketMeasure(rowRef, leftListRef) {
  const [leftMids, setLeftMids] = useState([]);

  const measure = useCallback(() => {
    const rowEl  = rowRef.current;
    const leftEl = leftListRef.current;
    if (!rowEl || !leftEl) return;
    const mids = getMidpoints(leftEl, rowEl);
    setLeftMids(prev => {
      const same = prev.length === mids.length &&
        prev.every((v, i) => Math.abs(v - mids[i]) < 0.5);
      return same ? prev : mids;
    });
  }, [rowRef, leftListRef]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (rowRef.current)    ro.observe(rowRef.current);
    if (leftListRef.current) ro.observe(leftListRef.current);
    return () => ro.disconnect();
  }, [measure]);

  // Compute where each right card's centre should be: midpoint between its two feeders
  const targetMids = [];
  for (let r = 0; r < leftMids.length / 2; r++) {
    const ly1 = leftMids[r * 2];
    const ly2 = leftMids[r * 2 + 1];
    if (ly1 != null && ly2 != null) targetMids.push((ly1 + ly2) / 2);
  }

  return { leftMids, targetMids };
}

export default function RegionBracket({
  region, regionKey, computed, updateScore,
  flipped = false, totalPot = 0, getGameStatus, initialRound = 0
}) {
  const seeds  = computed.regions[regionKey].seeds;
  const games  = computed.games[regionKey];
  const rounds = ['r1', 'r2', 'r3', 'r4'];

  const [mobileRound, setMobileRound] = useState(initialRound);
  const [userSelected, setUserSelected] = useState(false);

  const rowRef    = useRef(null);
  const listRefs  = [useRef(null), useRef(null), useRef(null), useRef(null)];

  const mobileRowRef   = useRef(null);
  const mobileLeftRef  = useRef(null);
  const mobileRightRef = useRef(null);

  // Measure connector data for each inter-round gap (desktop)
  const conn0 = useBracketMeasure(rowRef, listRefs[0]);
  const conn1 = useBracketMeasure(rowRef, listRefs[1]);
  const conn2 = useBracketMeasure(rowRef, listRefs[2]);
  const connectors = [conn0, conn1, conn2];

  // Mobile connector
  const mobileConn = useBracketMeasure(mobileRowRef, mobileLeftRef);

  useEffect(() => {
    if (!userSelected) setMobileRound(initialRound);
  }, [initialRound, userSelected]);

  function handleTabClick(i) { setUserSelected(true); setMobileRound(i); }

  function getTopTeam(round, gIdx) {
    return round === 'r1' ? seeds[games.r1[gIdx].top] : (games[round][gIdx].topTeam || null);
  }
  function getBottomTeam(round, gIdx) {
    return round === 'r1' ? seeds[games.r1[gIdx].bottom] : (games[round][gIdx].bottomTeam || null);
  }
  function getStatus(round, gIdx) {
    if (!getGameStatus) return null;
    return getGameStatus(getTopTeam(round, gIdx)?.espnId, getBottomTeam(round, gIdx)?.espnId);
  }

  function roundHeader(rIdx) {
    const pct    = cumulativePct(rIdx);
    const potAmt = dollarsEarned(rIdx, totalPot);
    const potStr = potAmt % 1 === 0 ? potAmt.toLocaleString() : potAmt.toFixed(2);
    return (
      <div className="round-header">
        <div className="round-label">{ROUND_LABELS[rIdx]}</div>
        <div className="round-date">{ROUND_DATES[rIdx]}</div>
        <div className="round-payout">
          <span className="payout-pct">{formatPct(pct)}</span>
          <span className="payout-amt"> = ${potStr}</span>
        </div>
      </div>
    );
  }

  // Render a game list. If targetMids provided, cards are absolutely positioned
  // so each one's centre aligns with the corresponding target Y (relative to rowRef).
  function gameList(round, rIdx, listRef, targetMids, rowRefForOffset, extraCardClass, onCardClick) {
    const positioned = targetMids && targetMids.length > 0 && rowRefForOffset;
    return (
      <div
        className="round-game-list"
        ref={listRef}
        style={positioned ? { position: 'relative' } : undefined}
      >
        {games[round].map((game, gIdx) => {
          let cardStyle;
          if (positioned && targetMids[gIdx] != null) {
            // targetMids[gIdx] is relative to rowRef top.
            // We need it relative to this list's top.
            const rowEl  = rowRefForOffset.current;
            const listEl = listRef.current;
            if (rowEl && listEl) {
              const listTop = listEl.getBoundingClientRect().top - rowEl.getBoundingClientRect().top;
              const cardH = listEl.children[gIdx]?.getBoundingClientRect().height || 80;
              cardStyle = {
                position: 'absolute',
                left: 0, right: 0,
                top: targetMids[gIdx] - listTop - cardH / 2,
              };
            }
          }
          return (
            <div
              key={game.id}
              className={['round-game-item', extraCardClass].filter(Boolean).join(' ')}
              style={cardStyle}
              onClick={onCardClick}
            >
              <Matchup
                topTeam={getTopTeam(round, gIdx)}
                bottomTeam={getBottomTeam(round, gIdx)}
                topScore={game.topScore}
                bottomScore={game.bottomScore}
                onTopScoreChange={val => updateScore(regionKey, round, gIdx, 'top', val)}
                onBottomScoreChange={val => updateScore(regionKey, round, gIdx, 'bottom', val)}
                roundIndex={rIdx}
                totalPot={totalPot}
                gameStatus={getStatus(round, gIdx)}
              />
            </div>
          );
        })}
      </div>
    );
  }

  // Desktop round column. R1 (rIdx=0) is the anchor — no positioning needed.
  // Later rounds use targetMids from the previous round's connector measurement.
  function roundColumn(rIdx, listRef, targetMids) {
    const round = rounds[rIdx];
    return (
      <div key={round} className="round-column">
        {roundHeader(rIdx)}
        {gameList(round, rIdx, listRef, rIdx > 0 ? targetMids : null, rowRef)}
      </div>
    );
  }

  // Build desktop items
  const desktopItems = [];
  for (let i = 0; i < 4; i++) {
    const targets = i > 0 ? connectors[i - 1].targetMids : null;
    desktopItems.push(roundColumn(i, listRefs[i], targets));
    if (i < 3) {
      desktopItems.push(
        <div key={`conn-${i}`}
          style={{ flexShrink: 0, width: CONN_W, alignSelf: 'stretch', position: 'relative' }}>
          <ConnectorSVG leftMids={connectors[i].leftMids} targetMids={connectors[i].targetMids} />
        </div>
      );
    }
  }

  const nextRound = Math.min(mobileRound + 1, 3);
  const showNext  = mobileRound < 3;
  const mKey      = rounds[mobileRound];
  const nKey      = rounds[nextRound];

  return (
    <div className={`region-bracket ${flipped ? 'region-flipped' : ''}`} data-region={regionKey}>
      <div className="region-label-bar">
        <span className="region-name">{region}</span>
      </div>

      {/* ── Desktop ── */}
      <div className="region-rounds desktop-rounds" ref={rowRef}>
        {desktopItems}
      </div>

      {/* ── Mobile ── */}
      <div className="mobile-rounds">
        <div className="mobile-round-tabs">
          {ROUND_SHORT.map((label, i) => (
            <button key={i}
              className={`mobile-round-tab ${mobileRound === i ? 'active' : ''}`}
              onClick={() => handleTabClick(i)}>
              <span className="tab-short">{label}</span>
              <span className="tab-date">{ROUND_DATES[i]}</span>
              <span className="tab-pct">{formatPct(cumulativePct(i))}</span>
            </button>
          ))}
        </div>

        <div className="mobile-round-panel">
          <div className="mobile-split-view" ref={mobileRowRef}>

            {/* Current round — anchor column, no positioning */}
            <div className="mobile-split-col">
              <div className="mobile-split-header">
                <span className="mobile-split-label">{ROUND_LABELS[mobileRound]}</span>
                <span className="mobile-split-pct">{formatPct(cumulativePct(mobileRound))}</span>
              </div>
              <div className="mobile-game-stack" ref={mobileLeftRef}>
                {games[mKey].map((game, gIdx) => (
                  <div key={game.id} className="mobile-game-card">
                    <Matchup
                      topTeam={getTopTeam(mKey, gIdx)}
                      bottomTeam={getBottomTeam(mKey, gIdx)}
                      topScore={game.topScore}
                      bottomScore={game.bottomScore}
                      onTopScoreChange={val => updateScore(regionKey, mKey, gIdx, 'top', val)}
                      onBottomScoreChange={val => updateScore(regionKey, mKey, gIdx, 'bottom', val)}
                      roundIndex={mobileRound}
                      totalPot={totalPot}
                      gameStatus={getStatus(mKey, gIdx)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {showNext && <>
              {/* Connector column */}
              <div style={{ flexShrink: 0, width: CONN_W, alignSelf: 'stretch', position: 'relative' }}>
                <ConnectorSVG leftMids={mobileConn.leftMids} targetMids={mobileConn.targetMids} />
              </div>

              {/* Next round — cards positioned at connector target Ys */}
              <div className="mobile-split-col mobile-split-next">
                <div className="mobile-split-header">
                  <span className="mobile-split-label">{ROUND_LABELS[nextRound]}</span>
                  <span className="mobile-split-pct">{formatPct(cumulativePct(nextRound))}</span>
                </div>
                <div className="mobile-game-stack" ref={mobileRightRef}
                  style={{ position: 'relative' }}>
                  {games[nKey].map((game, gIdx) => {
                    const target = mobileConn.targetMids[gIdx];
                    let cardStyle;
                    if (target != null && mobileRowRef.current && mobileRightRef.current) {
                      const rowTop  = mobileRowRef.current.getBoundingClientRect().top;
                      const listTop = mobileRightRef.current.getBoundingClientRect().top;
                      const cardH   = mobileRightRef.current.children[gIdx]?.getBoundingClientRect().height || 80;
                      cardStyle = {
                        position: 'absolute',
                        left: 0, right: 0,
                        top: target - (listTop - rowTop) - cardH / 2,
                      };
                    }
                    return (
                      <div key={game.id}
                        className="mobile-game-card mobile-next-game"
                        style={cardStyle}
                        onClick={() => handleTabClick(nextRound)}>
                        <Matchup
                          topTeam={getTopTeam(nKey, gIdx)}
                          bottomTeam={getBottomTeam(nKey, gIdx)}
                          topScore={game.topScore}
                          bottomScore={game.bottomScore}
                          onTopScoreChange={val => updateScore(regionKey, nKey, gIdx, 'top', val)}
                          onBottomScoreChange={val => updateScore(regionKey, nKey, gIdx, 'bottom', val)}
                          roundIndex={nextRound}
                          totalPot={totalPot}
                          gameStatus={getStatus(nKey, gIdx)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </>}
          </div>
        </div>
      </div>
    </div>
  );
}
