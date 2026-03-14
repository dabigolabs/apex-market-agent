import { ScanCard } from './components';

export function RightSidebar({ ctx }) {
  const { BOR, Btn, G, Inp, R, S1, S2, Sel, Y, addAForm, alertId, cpi, fredData, getMemoryInsights, globalMarkets, hasKey, macroDisplay, marketSession, newA, news, priceAlerts, prices, qp, rpTab, setAddAForm, setNewA, setPriceAlerts, setRpTab, setShowSettings, tagBg, tagC, toast } = ctx;
  return (
      <div style={{ background: S1, borderLeft: `1px solid ${BOR}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${BOR}` }}>
          {[{ id: "news", l: "NEWS" }, { id: "alerts", l: "ALERTS" }, { id: "macro", l: "MACRO" }, { id: "global", l: "🌐 GLOBAL" }].map(t => (
            <div key={t.id} onClick={() => setRpTab(t.id)} style={{ flex: 1, padding: "9px 4px", textAlign: "center", fontSize: 9, fontFamily: "monospace", cursor: "pointer", letterSpacing: 1, color: rpTab === t.id ? G : "#2a4050", borderBottom: rpTab === t.id ? `2px solid ${G}` : "2px solid transparent", background: rpTab === t.id ? "rgba(0,229,160,.04)" : "transparent", transition: ".15s" }}>{t.l}</div>
          ))}
        </div>

        {rpTab === "news" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase" }}>Live News</div>
              {news.length > 0 && <span style={{ fontSize: 9, fontFamily: "monospace", color: G }}>● {news.length}</span>}
            </div>
            {news.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: "#2a4050", fontFamily: "monospace", fontSize: 11 }}>{hasKey ? "Fetching news..." : "Add Finnhub key for live news"}</div>}
            {news.map((n, i) => (
              <div key={i} className="hov" onClick={() => qp(`Analyze trading impact of: "${n.title}". Which stocks/sectors affected, directional bias, entry/target/stop.`)}
                style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "9px 11px", marginBottom: 7, cursor: "pointer", transition: ".15s" }}>
                <div style={{ fontFamily: "monospace", fontSize: 8, color: G, letterSpacing: 1, marginBottom: 3 }}>{n.src}</div>
                <div style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.45, marginBottom: 5 }}>{n.title}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ display: "inline-block", padding: "2px 6px", borderRadius: 4, fontSize: 8, fontFamily: "monospace", background: tagBg(n.tag), color: tagC(n.tag), border: `1px solid ${tagC(n.tag)}33` }}>{n.tag.toUpperCase()}</span>
                  <span style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050" }}>{n.time} ago</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {rpTab === "alerts" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase", marginBottom: 8 }}>Price Alerts</div>
            {priceAlerts.map(a => (
              <div key={a.id} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "9px 11px", marginBottom: 7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 700, color: "#e8f4ff" }}>{a.sym}</span>
                  <div onClick={() => setPriceAlerts(prev => prev.map(x => x.id === a.id ? { ...x, on: !x.on } : x))} style={{ width: 25, height: 14, borderRadius: 7, background: a.on ? G : BOR, cursor: "pointer", position: "relative", transition: ".2s" }}>
                    <div style={{ position: "absolute", top: 2, width: 10, height: 10, borderRadius: "50%", background: "#fff", transition: ".2s", left: a.on ? 13 : 2 }} />
                  </div>
                </div>
                <div style={{ fontFamily: "monospace", fontSize: 10, color: "#2a4050", marginBottom: 3 }}>{a.label}</div>
                <div style={{ fontSize: 10, color: a.triggered ? G : a.on ? "#162030" : "#0e1a24", display: "flex", justifyContent: "space-between" }}>
                  <span>{a.triggered ? "⚡ TRIGGERED" : a.on ? "● Monitoring" : "⊘ Paused"}</span>
                  <span onClick={() => setPriceAlerts(prev => prev.filter(x => x.id !== a.id))} style={{ color: "#162030", cursor: "pointer" }} onMouseOver={e => e.target.style.color = R} onMouseOut={e => e.target.style.color = "#162030"}>✕</span>
                </div>
              </div>
            ))}
            {addAForm ? (
              <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "11px" }}>
                <Inp placeholder="Ticker" value={newA.sym} onChange={e => setNewA(p => ({ ...p, sym: e.target.value.toUpperCase() }))} />
                <Sel value={newA.cond} onChange={e => setNewA(p => ({ ...p, cond: e.target.value }))}><option value="above">Crosses above $</option><option value="below">Crosses below $</option><option value="pct_up">% gain exceeds</option><option value="pct_dn">% loss exceeds</option></Sel>
                <Inp type="number" placeholder="Value" value={newA.val} onChange={e => setNewA(p => ({ ...p, val: e.target.value }))} style={{ marginBottom: 9 }} />
                <div style={{ display: "flex", gap: 6 }}>
                  <Btn onClick={() => setAddAForm(false)}>Cancel</Btn>
                  <Btn onClick={() => { if (!newA.sym) return; const cm = { above: `crosses above $${newA.val}`, below: `crosses below $${newA.val}`, pct_up: `gains >${newA.val}%`, pct_dn: `drops >${newA.val}%` }; setPriceAlerts(prev => [...prev, { id: ++alertId.current, sym: newA.sym, cond: newA.cond, val: parseFloat(newA.val), label: `${newA.sym} ${cm[newA.cond]}`, on: true, triggered: false }]); setNewA({ sym: "", cond: "above", val: "" }); setAddAForm(false); toast("✓ Alert Active", `Watching ${newA.sym}`, "info"); }} primary>Save</Btn>
                </div>
              </div>
            ) : <button className="hovg" onClick={() => setAddAForm(true)} style={{ width: "100%", padding: "8px", borderRadius: 8, border: `1px dashed #1e3040`, background: "transparent", color: "#2a4050", fontSize: 10, cursor: "pointer", fontFamily: "monospace", transition: ".15s", marginTop: 4 }}>+ Add Alert</button>}
          </div>
        )}

        {rpTab === "macro" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase", marginBottom: 8 }}>Macro Dashboard</div>
            {fredData.ffr ? [
              { label: "Fed Funds Rate", val: `${fredData.ffr}%`, color: R },
              { label: "CPI (Latest)", val: fredData.cpi, color: Y },
              { label: "GDP Growth", val: `${fredData.gdp}%`, color: G },
              { label: "Unemployment", val: `${fredData.unemp}%`, color: G },
            ].map((m, i) => (
              <div key={i} className="hov" onClick={() => qp(`Explain current ${m.label} of ${m.val} and trading implications.`)} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 8, padding: "8px 10px", marginBottom: 5, cursor: "pointer" }}>
                <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{m.label} · FRED</div>
                <div style={{ fontFamily: "monospace", fontSize: 15, fontWeight: 700, color: m.color }}>{m.val}</div>
              </div>
            )) : (
              <div style={{ background: "rgba(245,200,66,.07)", border: "1px solid rgba(245,200,66,.15)", borderRadius: 9, padding: "11px", marginBottom: 10 }}>
                <div style={{ color: Y, fontSize: 11, fontWeight: 600, marginBottom: 4 }}>Add FRED Key for Macro Data</div>
                <div style={{ color: "#6677aa", fontSize: 10, lineHeight: 1.5, marginBottom: 7 }}>Free at fred.stlouisfed.org — unlocks live CPI, GDP, Fed rate, unemployment.</div>
                <button onClick={() => setShowSettings(true)} style={{ width: "100%", padding: "6px", borderRadius: 6, background: Y, border: "none", color: "#000", fontSize: 10, cursor: "pointer", fontWeight: 700, fontFamily: "monospace" }}>Open API Settings →</button>
              </div>
            )}
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase", marginBottom: 7, marginTop: 6 }}>Instruments · Live</div>
            {macroDisplay.map((m, i) => {
              const p = prices[m.sym];
              return <div key={i} className="hov" onClick={() => qp(`Analyze ${m.label} and market implications.`)} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 8, padding: "8px 10px", marginBottom: 5, cursor: "pointer" }}>
                <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", letterSpacing: 1, textTransform: "uppercase", marginBottom: 2 }}>{m.label}</div>
                {p ? <div style={{ display: "flex", justifyContent: "space-between" }}><div style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: p.chg >= 0 ? G : R }}>{p.price}</div><div style={{ fontFamily: "monospace", fontSize: 10, color: p.chg >= 0 ? G : R }}>{p.chg >= 0 ? "▲" : "▼"}{Math.abs(p.chg).toFixed(2)}%</div></div>
                  : <div style={{ fontFamily: "monospace", fontSize: 10, color: "#1a2a36" }}>—</div>}
              </div>;
            })}

            {/* Market Session Gate */}
            <div style={{ marginTop: 10, background: marketSession.quality === "prime" ? "rgba(0,229,160,.08)" : marketSession.quality === "avoid" ? "rgba(255,68,102,.08)" : "rgba(0,0,0,.2)", border: `1px solid ${marketSession.quality === "prime" ? "rgba(0,229,160,.25)" : marketSession.quality === "avoid" ? "rgba(255,68,102,.25)" : "#162030"}`, borderRadius: 9, padding: "10px 12px" }}>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 2, marginBottom: 5 }}>Market Session</div>
              <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: marketSession.quality === "prime" ? G : marketSession.quality === "avoid" ? R : Y }}>{marketSession.session}</div>
              <div style={{ fontSize: 10, color: "#4a6070", marginTop: 3 }}>{marketSession.quality === "prime" ? "✅ Prime entry window" : marketSession.quality === "avoid" ? "⚠ Avoid — chaotic trading" : marketSession.open ? "⚡ Market open" : "⊘ Market closed"}</div>
            </div>

            {/* APEX Memory Insights */}
            {(() => {
              const insights = getMemoryInsights();
              if (!insights) return null;
              return (
                <div style={{ marginTop: 8, background: "rgba(0,170,255,.06)", border: "1px solid rgba(0,170,255,.2)", borderRadius: 9, padding: "10px 12px" }}>
                  <div style={{ fontSize: 8, fontFamily: "monospace", color: B, textTransform: "uppercase", letterSpacing: 2, marginBottom: 5 }}>🧠 YOUR PATTERNS</div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#c8d8e8", marginBottom: 4 }}>Win Rate: <span style={{ color: parseInt(insights.wr) > 60 ? G : Y }}>{insights.wr}%</span> ({insights.count} trades)</div>
                  {insights.bestFG && <div style={{ fontSize: 10, color: "#4a6070" }}>Best Fear&Greed: ~{insights.bestFG}</div>}
                  {insights.bestSession && <div style={{ fontSize: 10, color: "#4a6070" }}>Best session: {insights.bestSession}</div>}
                </div>
              );
            })()}
          </div>
        )}

        {rpTab === "global" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "10px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 2, color: "#2a4050", textTransform: "uppercase", marginBottom: 8 }}>Global Markets · Overnight</div>

            {/* Overnight verdict */}
            {globalMarkets.length > 0 && (() => {
              const intl = globalMarkets.filter(m => m.region !== "Currency");
              const avgChg = intl.reduce((a, m) => a + m.chg, 0) / (intl.length || 1);
              const verdict = avgChg > 0.5 ? { label: "RISK-ON OVERNIGHT", color: G } : avgChg < -0.5 ? { label: "RISK-OFF OVERNIGHT", color: R } : { label: "MIXED OVERNIGHT", color: Y };
              return (
                <div style={{ background: `${verdict.color}12`, border: `1px solid ${verdict.color}33`, borderRadius: 9, padding: "9px 12px", marginBottom: 10, textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: verdict.color }}>{verdict.label}</div>
                  <div style={{ fontSize: 9, fontFamily: "monospace", color: "#4a6070", marginTop: 2 }}>Avg intl chg: {avgChg >= 0 ? "+" : ""}{avgChg.toFixed(2)}%</div>
                </div>
              );
            })()}

            {/* World indices */}
            <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Indices</div>
            {globalMarkets.filter(m => m.region !== "Currency").map((m, i) => (
              <div key={i} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 7, padding: "7px 10px", marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: "#c8d8e8", fontWeight: 600 }}>{m.name}</div>
                    <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050" }}>{m.region}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#c8d8e8" }}>{m.price?.toLocaleString()}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: m.chg >= 0 ? G : R }}>{m.chg >= 0 ? "▲" : "▼"}{Math.abs(m.chg).toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            ))}

            {/* Currencies */}
            <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6, marginTop: 10 }}>Key Currencies</div>
            {globalMarkets.filter(m => m.region === "Currency").map((m, i) => (
              <div key={i} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 7, padding: "7px 10px", marginBottom: 4 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#c8d8e8" }}>{m.name}</div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#c8d8e8" }}>{m.price}</div>
                    <div style={{ fontSize: 10, fontFamily: "monospace", color: m.chg >= 0 ? G : R }}>{m.chg >= 0 ? "+" : ""}{m.chg.toFixed(2)}%</div>
                  </div>
                </div>
              </div>
            ))}

            {globalMarkets.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: "#2a4050", fontFamily: "monospace", fontSize: 11 }}>Loading global data...</div>}

            <button onClick={() => qp("Give me a complete global pre-market brief — overnight markets verdict, currency signals, commodity picture, key risks and what it means for today's US session.")} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "rgba(0,229,160,.08)", border: `1px solid rgba(0,229,160,.2)`, color: G, fontSize: 10, cursor: "pointer", fontFamily: "monospace", marginTop: 10 }}>
              ⬡ Generate AI Global Brief
            </button>
          </div>
        )}
      </div>
    );
}
