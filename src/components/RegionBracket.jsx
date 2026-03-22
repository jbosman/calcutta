import React, { useState, useEffect, useRef, useCallback } from 'react';
import Matchup from './Matchup';
import { cumulativePct, formatPct, dollarsEarned } from '../utils/payouts';

const ROUND_LABELS = ['1st Round', '2nd Round', 'Sweet 16', 'Elite 8'];
const ROUND_SHORT  = ['R1', 'R2', 'S16', 'E8'];
const ROUND_DATES  = ['Mar 19-20', 'Mar 21-22', 'Mar 26-27', 'Mar 28-29'];
const CONN_W = 20;

// Mobile constants — must match CSS variables set in .mobile-split-view
const MOB_CARD_H = 78;  // 2 * 36px slots + 1px divider + border ≈ 78
const MOB_GAP    = 4;

function getMidpointsRelativeTo(listEl, ancestorEl) {
  if (!listEl || !ancestorEl) return [];
  const baseTop = ancestorEl.getBoundingClientRect().top;
  return Array.from(listEl.children).map(child => {
    const r = child.getBoundingClientRect();
    return r.top - baseTop + r.height / 2;
  });
}

function ConnectorLines({ leftMids, rightMids, height, flipped }) {
  if (!leftMids.length || !rightMids.length || !height) return null;
  const paths = [];
  const xL = flipped ? CONN_W : 0;
  const xR = flipped ? 0 : CONN_W;
  const xM = CONN_W / 2;

  for (let r = 0; r < rightMids.length; r++) {
    const ly1 = leftMids[r * 2];
    const ly2 = leftMids[r * 2 + 1];
    const ry  = rightMids[r];
    if (ly1 === undefined || isNaN(ly1) || ly2 === undefined || isNaN(ly2)) continue;
    paths.push(`M ${xL} ${ly1} H ${xM}`);
    paths.push(`M ${xL} ${ly2} H ${xM}`);
    paths.push(`M ${xM} ${ly1} V ${ly2}`);
    paths.push(`M ${xM} ${ry}  H ${xR}`);
  }

  return (
    <svg width={CONN_W} height={height}
      style={{ flexShrink: 0, display: 'block', overflow: 'visible', alignSelf: 'flex-start' }}>
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="var(--c-border)" strokeWidth="1.5"
              fill="none" strokeLinecap="round" />
      ))}
    </svg>
  );
}

// Desktop connector: measures actual DOM positions relative to the row container
function MeasuredConnector({ rowRef, leftListRef, rightListRef, flipped }) {
  const [state, setState] = useState({ leftMids: [], rightMids: [], height: 0 });

  const measure = useCallback(() => {
    const rowEl  = rowRef.current;
    const leftEl = leftListRef.current;
    const rightEl = rightListRef.current;
    if (!rowEl || !leftEl || !rightEl) return;
    const leftMids  = getMidpointsRelativeTo(leftEl, rowEl);
    const rightMids = getMidpointsRelativeTo(rightEl, rowEl);
    setState({ leftMids, rightMids, height: rowEl.getBoundingClientRect().height });
  }, [rowRef, leftListRef, rightListRef]);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (rowRef.current)    ro.observe(rowRef.current);
    if (leftListRef.current)  ro.observe(leftListRef.current);
    if (rightListRef.current) ro.observe(rightListRef.current);
    return () => ro.disconnect();
  }, [measure]);

  return (
    <div style={{ flexShrink: 0, width: CONN_W, alignSelf: 'flex-start' }}>
      <ConnectorLines {...state} flipped={flipped} />
    </div>
  );
}

// Mobile connector: uses fixed card dimensions offset by the header height.
// headerOffset = the pixel height of .mobile-split-header (measured by caller).
function MobileConnector({ leftN, rightN, headerOffset = 0 }) {
  const cardH = MOB_CARD_H;
  const gap   = MOB_GAP;
  const slotH = cardH + gap;

  const paths = [];
  const xL = 0, xM = CONN_W / 2, xR = CONN_W;

  for (let r = 0; r < rightN; r++) {
    const l1 = r * 2;
    const l2 = r * 2 + 1;
    // Card midpoints relative to the top of the column (which includes the header)
    const ly1 = headerOffset + l1 * slotH + cardH / 2;
    const ly2 = headerOffset + l2 * slotH + cardH / 2;
    const ry  = (ly1 + ly2) / 2;

    paths.push(`M ${xL} ${ly1} H ${xM}`);
    paths.push(`M ${xL} ${ly2} H ${xM}`);
    paths.push(`M ${xM} ${ly1} V ${ly2}`);
    paths.push(`M ${xM} ${ry}  H ${xR}`);
  }

  const totalH = headerOffset + leftN * cardH + (leftN - 1) * gap;

  return (
    <div style={{ flexShrink: 0, width: CONN_W }}>
      <svg width={CONN_W} height={totalH}
           style={{ display: 'block', overflow: 'visible' }}>
        {paths.map((d, i) => (
          <path key={i} d={d} stroke="var(--c-border)" strokeWidth="1.5"
                fill="none" strokeLinecap="round" />
        ))}
      </svg>
    </div>
  );
}

export default function RegionBracket({
  region, regionKey, computed, updateScore,
  flipped = false, totalPot = 0, getGameStatus, initialRound = 0
}) {
  const seeds  = computed.regions[regionKey].seeds;
  const games  = computed.games[regionKey];
  const rounds = ['r1', 'r2', 'r3', 'r4'];
  const roundCounts = [8, 4, 2, 1];

  const [mobileRound, setMobileRound] = useState(initialRound);
  const [userSelected, setUserSelected] = useState(false);

  const listRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];
  const rowRef   = useRef(null);

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

  function roundColumn(rIdx, listRef) {
    const round = rounds[rIdx];
    const roundGames = games[round];
    return (
      <div key={round} className="round-column">
        {roundHeader(rIdx)}
        <div className="round-game-list" ref={listRef}>
          {roundGames.map((game, gIdx) => (
            <div key={game.id} className="round-game-item">
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
          ))}
        </div>
      </div>
    );
  }

  // Desktop items: columns interleaved with measured connectors
  const desktopItems = [];
  for (let i = 0; i < 4; i++) {
    desktopItems.push(roundColumn(i, listRefs[i]));
    if (i < 3) {
      desktopItems.push(
        <MeasuredConnector
          key={`conn-${i}`}
          rowRef={rowRef}
          leftListRef={listRefs[i]}
          rightListRef={listRefs[i + 1]}
          flipped={false}
        />
      );
    }
  }

  // Mobile split view
  const nextRound   = Math.min(mobileRound + 1, 3);
  const showNext    = mobileRound < 3;
  const mKey        = rounds[mobileRound];
  const nKey        = rounds[nextRound];
  const mN          = roundCounts[mobileRound];
  const nN          = roundCounts[nextRound];

  // Measure the split header height so the connector can offset its y=0 to
  // match where the game cards actually start (below the header).
  const headerRef = useRef(null);
  const [headerH, setHeaderH] = useState(0);
  useEffect(() => {
    if (!headerRef.current) return;
    const ro = new ResizeObserver(() => {
      setHeaderH(headerRef.current?.offsetHeight ?? 0);
    });
    ro.observe(headerRef.current);
    setHeaderH(headerRef.current.offsetHeight);
    return () => ro.disconnect();
  }, []);

  // Next-round cards are absolutely positioned — nextCardOffset no longer needed

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
            <button
              key={i}
              className={`mobile-round-tab ${mobileRound === i ? 'active' : ''}`}
              onClick={() => handleTabClick(i)}
            >
              <span className="tab-short">{label}</span>
              <span className="tab-date">{ROUND_DATES[i]}</span>
              <span className="tab-pct">{formatPct(cumulativePct(i))}</span>
            </button>
          ))}
        </div>

        <div className="mobile-round-panel">
          <div className="mobile-split-view">

            {/* Current round — fixed-height cards */}
            <div className="mobile-split-col">
              <div className="mobile-split-header" ref={headerRef}>
                <span className="mobile-split-label">{ROUND_LABELS[mobileRound]}</span>
                <span className="mobile-split-pct">{formatPct(cumulativePct(mobileRound))}</span>
              </div>
              <div className="mobile-game-stack">
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

            {/* Connector + next round */}
            {showNext && <>
              <MobileConnector leftN={mN} rightN={nN} headerOffset={headerH} />
              <div className="mobile-split-col mobile-split-next">
                <div className="mobile-split-header">
                  <span className="mobile-split-label">{ROUND_LABELS[nextRound]}</span>
                  <span className="mobile-split-pct">{formatPct(cumulativePct(nextRound))}</span>
                </div>
                {/* Position each next-round card so its vertical centre
                    lands exactly where the connector arrives — the midpoint
                    between its two feeder cards. */}
                <div className="mobile-next-stack">
                  {games[nKey].map((game, gIdx) => {
                    const slotH = MOB_CARD_H + MOB_GAP;
                    const ly1   = gIdx * 2       * slotH + MOB_CARD_H / 2;
                    const ly2   = (gIdx * 2 + 1) * slotH + MOB_CARD_H / 2;
                    const connectorY = (ly1 + ly2) / 2;   // where connector arrives
                    const cardTop    = connectorY - MOB_CARD_H / 2; // top of card
                    return (
                      <div
                        key={game.id}
                        className="mobile-game-card mobile-next-game"
                        style={{ position: 'absolute', top: cardTop + 'px', left: 0, right: 0 }}
                        onClick={() => handleTabClick(nextRound)}
                      >
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
