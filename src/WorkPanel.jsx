import { ScanCard, SetupCard } from './components';

export function WorkPanel({ ctx }) {
  const { BOR, Btn, G, Inp, R, S2, Y, addPForm, clearAll, clearDismissed, dismissSignal, favSignal, filteredAlerts, journal, journalForm, journalId, markAllRead, newJ, newP, pStats, portfolio, prices, qp, runStressTest, scanActive, scanAlerts, setAddPForm, setJournal, setJournalForm, setNewJ, setNewP, setPortfolio, setScanActive, setShowStressTest, setSignalFilter, showStressTest, signalFilter, toast, view } = ctx;
  return (<div style={{display:"contents"}}>
        {view === "signals" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>Live Signal Feed</div>
                <div style={{ fontSize: 11, color: "#2a4050", fontFamily: "monospace", marginTop: 2 }}>{scanAlerts.length} signals · {scanAlerts.filter(a => a.favorited).length} saved · scans every 5 min</div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button onClick={() => setScanActive(v => !v)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${BOR}`, background: scanActive ? "rgba(0,229,160,.1)" : "transparent", color: scanActive ? G : "#2a4050", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>{scanActive ? "● On" : "○ Off"}</button>
                <button onClick={markAllRead} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${BOR}`, background: "transparent", color: "#3a5060", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>Mark Read</button>
                <button onClick={clearDismissed} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid ${BOR}`, background: "transparent", color: "#3a5060", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>Clear Dismissed</button>
                <button onClick={clearAll} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid rgba(255,68,102,.3)`, background: "rgba(255,68,102,.07)", color: R, fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>Clear All</button>
              </div>
            </div>
            {/* Filter tabs */}
            <div style={{ display: "flex", gap: 4, marginBottom: 14 }}>
              {[{ id: "all", l: `All (${scanAlerts.filter(a => !a.dismissed || a.favorited).length})` }, { id: "favorited", l: `⭐ Saved (${scanAlerts.filter(a => a.favorited).length})` }, { id: "unread", l: `Unread (${scanAlerts.filter(a => !a.read && !a.dismissed).length})` }].map(f => (
                <button key={f.id} onClick={() => setSignalFilter(f.id)} style={{ padding: "5px 12px", borderRadius: 20, border: `1px solid ${signalFilter === f.id ? G : BOR}`, background: signalFilter === f.id ? "rgba(0,229,160,.1)" : "transparent", color: signalFilter === f.id ? G : "#3a5060", fontSize: 10, fontFamily: "monospace", cursor: "pointer" }}>{f.l}</button>
              ))}
            </div>
            {filteredAlerts.length === 0 ? (
              <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a4050", fontFamily: "monospace", fontSize: 12 }}>
                <div style={{ fontSize: 36, marginBottom: 12, animation: "scanPulse 2s infinite" }}>⬡</div>
                <div>{signalFilter === "favorited" ? "No saved signals yet — star a signal to save it" : "Scanner analyzing live data..."}</div>
              </div>
            ) : filteredAlerts.map(a => (
              <ScanCard key={a.id} a={a}
                onAct={() => qp(`Analyze this signal with live data and give me the complete trade setup: ${a.headline}. ${a.detail} Action: ${a.action}`)}
                onFav={() => favSignal(a.id)}
                onDismiss={() => dismissSignal(a.id)}
              />
            ))}
          </div>
        )}

        {/* PORTFOLIO */}
        {view === "portfolio" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>Portfolio <span style={{ fontSize: 11, color: G, fontFamily: "monospace", fontWeight: 400 }}>· Live P&L</span></div>
              <button onClick={() => setAddPForm(v => !v)} className="hovg" style={{ padding: "5px 13px", borderRadius: 7, border: `1px solid ${BOR}`, background: "transparent", color: "#2a4050", fontSize: 11, cursor: "pointer", fontFamily: "monospace", transition: ".15s" }}>{addPForm ? "✕ Cancel" : "+ Add Position"}</button>
              {portfolio.length > 0 && <button onClick={() => setShowStressTest(v => !v)} style={{ padding: "5px 10px", borderRadius: 7, border: `1px solid rgba(255,68,102,.3)`, background: "rgba(255,68,102,.07)", color: R, fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>⚡ Stress Test</button>}
            </div>
            {pStats && <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
              {[{ l: "Total Value", v: `$${parseFloat(pStats.tv).toLocaleString()}`, c: "#e8f4ff" }, { l: "Total Cost", v: `$${parseFloat(pStats.tc).toLocaleString()}`, c: "#6677aa" }, { l: "P&L", v: `$${pStats.pnl}`, c: parseFloat(pStats.pnl) >= 0 ? G : R }, { l: "Return", v: `${pStats.pct}%`, c: parseFloat(pStats.pct) >= 0 ? G : R }].map(s => (
                <div key={s.l} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{s.l}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>}
            {addPForm && <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 11, padding: "14px", marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><Inp placeholder="Ticker" value={newP.sym} onChange={e => setNewP(p => ({ ...p, sym: e.target.value.toUpperCase() }))} /><Inp placeholder="Shares" type="number" value={newP.shares} onChange={e => setNewP(p => ({ ...p, shares: e.target.value }))} /><Inp placeholder="Entry Price $" type="number" value={newP.entry} onChange={e => setNewP(p => ({ ...p, entry: e.target.value }))} /><Inp placeholder="Notes (optional)" value={newP.notes} onChange={e => setNewP(p => ({ ...p, notes: e.target.value }))} /></div>
              <div style={{ display: "flex", gap: 8 }}><Btn onClick={() => setAddPForm(false)}>Cancel</Btn><Btn onClick={() => { if (!newP.sym || !newP.entry || !newP.shares) return; setPortfolio(prev => [...prev, { id: Date.now(), sym: newP.sym, shares: parseFloat(newP.shares), entry: parseFloat(newP.entry), notes: newP.notes, date: new Date().toLocaleDateString() }]); setNewP({ sym: "", shares: "", entry: "", notes: "" }); setAddPForm(false); toast("✓ Added", newP.sym, "info"); }} primary>Add Position</Btn></div>
            </div>}
            {portfolio.length === 0 && !addPForm && <div style={{ textAlign: "center", padding: "40px", color: "#2a4050", fontFamily: "monospace", fontSize: 12 }}>No positions yet.</div>}

            {/* Stress Test Panel */}
            {showStressTest && portfolio.length > 0 && (
              <div style={{ background: "rgba(255,68,102,.05)", border: "1px solid rgba(255,68,102,.2)", borderRadius: 12, padding: "16px", marginBottom: 14, animation: "fadeUp .3s ease" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: R, fontWeight: 700 }}>⚡ PORTFOLIO STRESS TEST</div>
                  <button onClick={() => setShowStressTest(false)} style={{ background: "transparent", border: "none", color: "#4a6070", cursor: "pointer" }}>✕</button>
                </div>
                {[5, 10, 20].map(drop => {
                  const results = runStressTest(drop);
                  const totalLoss = results.reduce((a, r) => a + parseFloat(r.loss), 0);
                  return (
                    <div key={drop} style={{ marginBottom: 10, background: "rgba(0,0,0,.3)", borderRadius: 9, padding: "10px 12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#c8d8e8" }}>If market drops {drop}%</span>
                        <span style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: R }}>${totalLoss.toFixed(0)}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                        {results.map(r => (
                          <div key={r.sym} style={{ fontSize: 9, fontFamily: "monospace", background: "rgba(255,68,102,.1)", border: "1px solid rgba(255,68,102,.2)", borderRadius: 4, padding: "2px 6px", color: R }}>
                            {r.sym}: ${r.loss}
                          </div>
                        ))}
                      </div>
                    </div>
  );
                })}
                <button onClick={() => qp(`Stress test my portfolio: ${portfolio.map(p => `${p.sym} ${p.shares}sh @$${p.entry}`).join(", ")}. If market drops 10%, which positions are most at risk? Should I hedge? How?`)} style={{ width: "100%", padding: "7px", borderRadius: 7, background: "transparent", border: `1px solid rgba(255,68,102,.3)`, color: R, fontSize: 10, cursor: "pointer", fontFamily: "monospace", marginTop: 4 }}>
                  🤖 Get AI Hedge Recommendations
                </button>
              </div>
            )}
            {portfolio.map(p => {
              const cur = prices[p.sym]; const cp = cur ? cur.price : p.entry;
              const pnl = (cp - p.entry) * p.shares; const pp = ((cp - p.entry) / p.entry) * 100;
              return <div key={p.id} className="cc" onClick={() => qp(`Analyze my ${p.sym} position: entered $${p.entry}, currently $${cp.toFixed(2)}, ${p.shares} shares. P&L: $${pnl.toFixed(2)} (${pp.toFixed(2)}%). Hold, add, trim or exit?`)}
                style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 10, padding: "12px 14px", marginBottom: 8, cursor: "pointer", transition: ".2s" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}><span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#fff" }}>{p.sym}</span><span style={{ fontSize: 10, color: "#3a5060", fontFamily: "monospace" }}>{p.shares} @ ${p.entry}</span>{cur && <span style={{ fontSize: 9, color: G, fontFamily: "monospace" }}>Live</span>}</div>{p.notes && <div style={{ fontSize: 10, color: "#2a4050" }}>{p.notes}</div>}</div>
                  <div style={{ textAlign: "right" }}><div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: "#e8f4ff" }}>${(cp * p.shares).toFixed(2)}</div><div style={{ fontFamily: "monospace", fontSize: 11, color: pnl >= 0 ? G : R }}>{pnl >= 0 ? "+" : ""}${pnl.toFixed(2)} ({pp >= 0 ? "+" : ""}{pp.toFixed(2)}%)</div></div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTop: `1px solid ${BOR}` }}>
                  <span style={{ fontSize: 10, color: "#2a4050", fontFamily: "monospace" }}>Added {p.date} · Click for analysis</span>
                  <span onClick={e => { e.stopPropagation(); setPortfolio(prev => prev.filter(x => x.id !== p.id)); }} style={{ fontSize: 10, color: "#162030", cursor: "pointer", fontFamily: "monospace" }} onMouseOver={e => e.target.style.color = R} onMouseOut={e => e.target.style.color = "#162030"}>Remove</span>
                </div>
              </div>;
            })}
          </div>
        )}

        {/* JOURNAL */}
        {view === "journal" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>Trade Journal</div>
              <button onClick={() => setJournalForm(v => !v)} className="hovg" style={{ padding: "5px 13px", borderRadius: 7, border: `1px solid ${BOR}`, background: "transparent", color: "#2a4050", fontSize: 11, cursor: "pointer", fontFamily: "monospace", transition: ".15s" }}>{journalForm ? "✕ Cancel" : "+ Log Trade"}</button>
            </div>
            {js && <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
              {[{ l: "Trades", v: js.trades, c: "#e8f4ff" }, { l: "Win Rate", v: `${js.wr}%`, c: parseInt(js.wr) >= 60 ? G : parseInt(js.wr) >= 50 ? Y : R }, { l: "Total P&L", v: `$${js.totalPnl}`, c: parseFloat(js.totalPnl) >= 0 ? G : R }, { l: "Open", v: js.open, c: Y }].map(s => (
                <div key={s.l} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{s.l}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 17, fontWeight: 700, color: s.c }}>{s.v}</div>
                </div>
              ))}
            </div>}
            {journalForm && <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 11, padding: "14px", marginBottom: 12 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><Inp placeholder="Ticker" value={newJ.sym} onChange={e => setNewJ(p => ({ ...p, sym: e.target.value.toUpperCase() }))} /><Inp placeholder="Shares" type="number" value={newJ.shares} onChange={e => setNewJ(p => ({ ...p, shares: e.target.value }))} /><Inp placeholder="Entry $" type="number" value={newJ.entry} onChange={e => setNewJ(p => ({ ...p, entry: e.target.value }))} /><Inp placeholder="Exit $ (if closed)" type="number" value={newJ.exit} onChange={e => setNewJ(p => ({ ...p, exit: e.target.value }))} /></div>
              <Inp placeholder="Notes / thesis / lessons" value={newJ.notes} onChange={e => setNewJ(p => ({ ...p, notes: e.target.value }))} style={{ marginBottom: 9 }} />
              <div style={{ display: "flex", gap: 8 }}><Btn onClick={() => setJournalForm(false)}>Cancel</Btn><Btn onClick={() => { if (!newJ.sym || !newJ.entry) return; const result = newJ.exit && newJ.shares ? (parseFloat(newJ.exit) - parseFloat(newJ.entry)) * parseFloat(newJ.shares) : null; setJournal(prev => [{ id: ++journalId.current, sym: newJ.sym, entry: parseFloat(newJ.entry), exit: newJ.exit ? parseFloat(newJ.exit) : null, shares: parseFloat(newJ.shares) || 0, result: result?.toFixed(2) || null, notes: newJ.notes, date: new Date().toLocaleDateString() }, ...prev]); setNewJ({ sym: "", entry: "", exit: "", shares: "", notes: "" }); setJournalForm(false); toast("✓ Logged", newJ.sym, "info"); }} primary>Log Trade</Btn></div>
            </div>}
            {journal.length === 0 && !journalForm && <div style={{ textAlign: "center", padding: "40px", color: "#2a4050", fontFamily: "monospace", fontSize: 12 }}>No trades logged yet.</div>}
            {journal.map(j => (
              <div key={j.id} className="cc" onClick={() => qp(`Review trade: ${j.sym}, entry $${j.entry}${j.exit ? `, exit $${j.exit}` : ""}, ${j.shares} shares, P&L: $${j.result || "open"}. ${j.notes ? "Notes: " + j.notes : ""} What did I do right/wrong?`)}
                style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 10, padding: "12px 14px", marginBottom: 7, cursor: "pointer", transition: ".2s", borderLeft: `3px solid ${j.result === null ? Y : parseFloat(j.result) >= 0 ? G : R}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div><div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}><span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#fff" }}>{j.sym}</span><span style={{ fontSize: 9, color: "#3a5060", fontFamily: "monospace" }}>{j.date}</span>{!j.exit && <span style={{ fontSize: 9, fontFamily: "monospace", background: "rgba(245,200,66,.1)", color: Y, padding: "1px 6px", borderRadius: 4 }}>OPEN</span>}</div><div style={{ fontSize: 10, color: "#3a5060", fontFamily: "monospace" }}>Entry ${j.entry}{j.exit ? ` → $${j.exit}` : ""} · {j.shares} shares</div>{j.notes && <div style={{ fontSize: 10, color: "#2a4050", marginTop: 3 }}>{j.notes}</div>}</div>
                  {j.result !== null && <div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: parseFloat(j.result) >= 0 ? G : R }}>{parseFloat(j.result) >= 0 ? "+" : ""}${j.result}</div>}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* RISK CALC */}
  </div>
  );
}
