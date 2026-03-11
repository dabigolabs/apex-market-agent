import { PreflightPanel, GlossaryTip, SetupCard } from './components';

export function LeftSidebar({ BG, BOR, Inp, S1, S2, addWForm, addWatch, fearGreed, hasKey, journal, loading, macroDisplay, markAllRead, newW, notifCount, perfectSetup, portfolio, prices, qp, setAddWForm, setNewW, setShowSettings, setView, setWatchlist, setupLoading, view, watchlist }) {
  return (
      {/* LEFT SIDEBAR */}
      <div style={{ background: S1, borderRight: `1px solid ${BOR}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ padding: "10px 10px 8px" }}>
          <button className="pfbtn pbtn" onClick={perfectSetup} disabled={setupLoading || loading}
            style={{ width: "100%", padding: "11px 8px", borderRadius: 11, border: `1px solid rgba(0,229,160,.35)`, background: "linear-gradient(135deg,rgba(0,229,160,.12),rgba(0,170,255,.08))", color: "#fff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "monospace", letterSpacing: 1, transition: ".2s", position: "relative", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent,${G},transparent)` }} />
            {setupLoading || loading ? <>{[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: G, animation: `tdot 1.2s ease ${i * .2}s infinite` }} />)}<span style={{ color: G }}>Finding Setup...</span></> : <><span>⬡</span>FIND PERFECT SETUP</>}
          </button>
        </div>
        <div style={{ padding: "0 10px 6px", borderBottom: `1px solid ${BOR}` }}>
          {[{ id: "chat", icon: "◎", label: "Intelligence" }, { id: "signals", icon: "⬡", label: "Live Signals" }, { id: "portfolio", icon: "◈", label: "Portfolio" }, { id: "journal", icon: "◉", label: "Journal" }, { id: "sim", icon: "⚗", label: "Simulator" }, { id: "risk", icon: "◇", label: "Risk Calc" }, { id: "backtest", icon: "⌖", label: "Backtester" }].map(n => (
            <div key={n.id} className="hov" onClick={() => { setView(n.id); if (n.id === "signals") markAllRead(); }}
              style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 500, color: view === n.id ? G : "#3a5060", background: view === n.id ? "rgba(0,229,160,.08)" : "transparent", border: view === n.id ? "1px solid rgba(0,229,160,.16)" : "1px solid transparent", marginBottom: 1, transition: ".15s" }}>
              <span style={{ fontSize: 13 }}>{n.icon}</span>{n.label}
              {n.id === "signals" && notifCount > 0 && <span style={{ marginLeft: "auto", background: R, color: "#fff", fontSize: 8, fontFamily: "monospace", padding: "1px 5px", borderRadius: 8 }}>{notifCount}</span>}
            </div>
          ))}
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 7 }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase" }}>Watchlist</div>
            <button onClick={() => setAddWForm(v => !v)} className="hovg" style={{ background: "transparent", border: `1px solid ${BOR}`, borderRadius: 5, color: "#2a4050", fontSize: 9, cursor: "pointer", padding: "2px 7px", fontFamily: "monospace", transition: ".15s" }}>{addWForm ? "✕" : "+ Add"}</button>
          </div>
          {!hasKey && <div style={{ background: "rgba(245,200,66,.07)", border: "1px solid rgba(245,200,66,.15)", borderRadius: 8, padding: "9px 11px", marginBottom: 9, fontSize: 11 }}>
            <div style={{ color: Y, fontWeight: 600, marginBottom: 3 }}>⚡ Add Finnhub Key</div>
            <div style={{ color: "#6677aa", fontSize: 10, lineHeight: 1.5, marginBottom: 6 }}>Free at finnhub.io — needed for live prices</div>
            <button onClick={() => setShowSettings(true)} style={{ width: "100%", padding: "5px", borderRadius: 6, background: Y, border: "none", color: "#000", fontSize: 10, cursor: "pointer", fontWeight: 700, fontFamily: "monospace" }}>Open Settings →</button>
          </div>}
          {addWForm && (
            <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "9px", marginBottom: 9 }}>
              <Inp placeholder="Ticker (e.g. MSFT)" value={newW.sym} onChange={e => setNewW(p => ({ ...p, sym: e.target.value }))} onKeyDown={e => e.key === "Enter" && addWatch()} />
              <Inp placeholder="Name (optional)" value={newW.name} onChange={e => setNewW(p => ({ ...p, name: e.target.value }))} style={{ marginBottom: 7 }} />
              <button onClick={addWatch} style={{ width: "100%", padding: "6px", borderRadius: 6, background: G, border: "none", color: "#000", fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "monospace" }}>Add</button>
            </div>
          )}
          {watchlist.map(w => {
            const p = prices[w.sym];
            return (
              <div key={w.sym} className="hov" onClick={() => qp(`Complete analysis of ${w.sym}: price $${p?.price || "?"}, change ${p?.chg || "?"}%. Trend, key levels, setup, entry, targets, stops.`)}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", borderRadius: 7, cursor: "pointer", marginBottom: 2, transition: ".15s" }}>
                <div><div style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#e8f4ff" }}>{w.sym}</div><div style={{ fontSize: 9, color: "#2a4050" }}>{w.name}</div></div>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {p ? <div style={{ textAlign: "right" }}><div style={{ fontFamily: "monospace", fontSize: 11, color: "#6677aa" }}>${p.price}</div><div style={{ fontFamily: "monospace", fontSize: 9, color: p.chg >= 0 ? G : R }}>{p.chg >= 0 ? "+" : ""}{p.chg.toFixed(2)}%</div></div>
                    : <span style={{ fontFamily: "monospace", fontSize: 9, color: "#2a4050" }}>—</span>}
                  <span onClick={e => { e.stopPropagation(); setWatchlist(prev => prev.filter(x => x.sym !== w.sym)); }} style={{ color: "#162030", fontSize: 10, cursor: "pointer" }} onMouseOver={e => e.target.style.color = R} onMouseOut={e => e.target.style.color = "#162030"}>✕</span>
                </div>
              </div>
            );
          })}
          <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase", marginBottom: 7, marginTop: 14 }}>Fear & Greed</div>
          <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 8, padding: "9px 11px", marginBottom: 8 }}>
            {fearGreed ? <>
              <div style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 700, color: fearGreed.value > 60 ? R : fearGreed.value > 40 ? Y : G }}>{fearGreed.value} <span style={{ fontSize: 10, color: "#2a4050" }}>{fearGreed.label}</span></div>
              <div style={{ height: 4, background: `linear-gradient(90deg,${G},${Y},${R})`, borderRadius: 4, marginTop: 7, position: "relative" }}>
                <div style={{ position: "absolute", top: -3, width: 10, height: 10, borderRadius: "50%", background: "#fff", border: `2px solid ${BG}`, left: `${fearGreed.value}%`, transform: "translateX(-50%)" }} />
              </div>
            </> : <div style={{ fontFamily: "monospace", fontSize: 11, color: "#2a4050" }}>Loading...</div>}
          </div>
          <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase", marginBottom: 7 }}>Market Instruments</div>
          {macroDisplay.map(m => {
            const p = prices[m.sym];
            return (
              <div key={m.sym} className="hov" onClick={() => qp(`Analyze current ${m.label} and what it signals for markets.`)}
                style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 7, padding: "7px 10px", marginBottom: 4, cursor: "pointer", transition: ".15s" }}>
                <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", marginBottom: 1, textTransform: "uppercase", letterSpacing: 1 }}>{m.label}</div>
                {p ? <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: p.chg >= 0 ? G : R }}>{p.price}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 10, color: p.chg >= 0 ? G : R }}>{p.chg >= 0 ? "▲" : "▼"}{Math.abs(p.chg).toFixed(2)}%</div>
                </div> : <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a2a36" }}>—</div>}
              </div>
            );
          })}
        </div>
      </div>

  );
}
