import { useState } from 'react';
import { mdRender } from './scoring';
import { PreflightPanel } from './components';

export function SimPanel({ ctx }) {
  const { BOR, G, Inp, R, S2, Y, addSimForm, addSimulation, calcRisk, getMemoryInsights, lastUpdated, manualCloseSim, newSim, prices, qp, riskResult, riskVal, setAddSimForm, setNewSim, setRiskVal, setSimHistTab, setSimHistory, simHistTab, simHistory, simulations, view } = ctx;
  return (<>
        {view === "sim" && (() => {
          const wins = simHistory.filter(s => s.outcome === "WIN" || s.outcome === "PARTIAL_WIN");
          const losses = simHistory.filter(s => s.outcome === "LOSS");
          const bailouts = simHistory.filter(s => s.outcome === "BAILOUT");
          const total = simHistory.length;
          const winRate = total ? ((wins.length / total) * 100).toFixed(1) : "—";
          const totalPnl = simHistory.reduce((acc, s) => acc + parseFloat(s.pnl || 0), 0);
          const avgWin = wins.length ? (wins.reduce((a, s) => a + parseFloat(s.pnl), 0) / wins.length).toFixed(2) : "—";
          const avgLoss = [...losses, ...bailouts].length ? (([...losses, ...bailouts].reduce((a, s) => a + parseFloat(s.pnl), 0)) / ([...losses, ...bailouts].length)).toFixed(2) : "—";
          const bestTrade = total ? simHistory.reduce((a, b) => parseFloat(a.pnl) > parseFloat(b.pnl) ? a : b) : null;
          const worstTrade = total ? simHistory.reduce((a, b) => parseFloat(a.pnl) < parseFloat(b.pnl) ? a : b) : null;
          const streak = (() => {
            if (!total) return { cur: 0, type: "—" };
            let cur = 0, type = simHistory[simHistory.length - 1]?.outcome?.includes("WIN") ? "W" : "L";
            for (let i = simHistory.length - 1; i >= 0; i--) {
              const isWin = simHistory[i].outcome?.includes("WIN");
              if ((type === "W" && isWin) || (type === "L" && !isWin)) cur++;
              else break;
            }
            return { cur, type };
          })();

          return (
            <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>Paper Simulator <span style={{ fontSize: 11, color: G, fontFamily: "monospace", fontWeight: 400 }}>· Live Tracking</span></div>
                <button onClick={() => setAddSimForm(v => !v)} className="hovg" style={{ padding: "5px 13px", borderRadius: 7, border: `1px solid ${BOR}`, background: "transparent", color: "#2a4050", fontSize: 11, cursor: "pointer", fontFamily: "monospace", transition: ".15s" }}>{addSimForm ? "✕ Cancel" : "+ New Sim"}</button>
              </div>

              {/* Sub-tabs */}
              <div style={{ display: "flex", borderBottom: `1px solid ${BOR}`, marginBottom: 14, overflowX: "auto" }}>
                {[["active", `⚡ Active (${simulations.length})`], ["history", `📁 History (${total})`], ["stats", "📊 Analytics"], ["report", "📋 Weekly"]].map(([id, label]) => (
                  <div key={id} onClick={() => setSimHistTab(id)} style={{ padding: "7px 14px", fontSize: 11, fontFamily: "monospace", cursor: "pointer", color: simHistTab === id ? G : "#3a5060", borderBottom: simHistTab === id ? `2px solid ${G}` : "2px solid transparent", transition: ".15s", whiteSpace: "nowrap", flexShrink: 0 }}>{label}</div>
                ))}
              </div>

              {/* New Sim Form */}
              {addSimForm && (
                <div style={{ background: S2, border: `1px solid rgba(0,229,160,.2)`, borderRadius: 12, padding: "16px", marginBottom: 16, animation: "fadeUp .3s ease" }}>
                  <div style={{ fontSize: 10, fontFamily: "monospace", color: G, letterSpacing: 2, marginBottom: 12, textTransform: "uppercase" }}>New Paper Trade</div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    {[["Symbol", "sym", "e.g. NVDA"], ["Shares", "shares", "e.g. 33"], ["Entry Price ($)", "entry", "e.g. 181.50"], ["Soft Stop ($)", "softStop", "e.g. 175.50"], ["Hard Stop ($)", "hardStop", "e.g. 171.00"], ["Target 1 ($)", "t1", "e.g. 198.00"], ["Target 2 ($)", "t2", "e.g. 218.00"], ["Target 3 ($)", "t3", "e.g. 245.00"]].map(([label, key, ph]) => (
                      <div key={key}>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{label}</div>
                        <Inp value={newSim[key]} onChange={e => setNewSim(p => ({ ...p, [key]: e.target.value }))} placeholder={ph} style={{ marginBottom: 0 }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={addSimulation} style={{ width: "100%", padding: "10px", borderRadius: 9, background: G, border: "none", color: "#000", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "monospace", marginTop: 4 }}>🚀 Launch Simulation</button>
                </div>
              )}

              {/* ACTIVE TAB */}
              {simHistTab === "active" && (
                <div style={{display:"contents"}}>
                  {simulations.length === 0 && !addSimForm && (
                    <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a4050", fontFamily: "monospace" }}>
                      <div style={{ fontSize: 28, marginBottom: 12 }}>⚗</div>
                      <div style={{ fontSize: 13, marginBottom: 6 }}>No simulations running</div>
                      <div style={{ fontSize: 11, color: "#162030" }}>Click "+ New Sim" to paper trade with live prices</div>
                    </div>
                  )}
                  {simulations.map(sim => {
                    const pnl = parseFloat(sim.pnl);
                    const pnlColor = pnl >= 0 ? G : R;
                    const lp = sim.livePrice || parseFloat(sim.entry);
                    const pct = ((lp - parseFloat(sim.entry)) / parseFloat(sim.entry) * 100).toFixed(2);
                    const statusColor = sim.status === "ACTIVE" ? G : sim.status === "CLOSED" ? "#8899bb" : Y;
                    return (
                      <div key={sim.id} style={{ background: S2, border: `1px solid ${sim.status === "ACTIVE" ? "rgba(0,229,160,.15)" : BOR}`, borderRadius: 12, padding: "14px", marginBottom: 14, animation: "fadeUp .3s ease" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
                          <div>
                            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>{sim.sym}</span>
                            <span style={{ marginLeft: 8, fontSize: 9, fontFamily: "monospace", padding: "2px 7px", borderRadius: 4, background: `${statusColor}22`, color: statusColor, border: `1px solid ${statusColor}44` }}>{sim.status}</span>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: pnlColor }}>{pnl >= 0 ? "+" : ""}${pnl}</div>
                            <div style={{ fontFamily: "monospace", fontSize: 10, color: pnlColor }}>{pct >= 0 ? "+" : ""}{pct}%</div>
                          </div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, marginBottom: 10 }}>
                          {[["Entry", `$${parseFloat(sim.entry).toFixed(2)}`], ["Live", `$${typeof lp === "number" ? lp.toFixed(2) : lp}`], ["Shares", `${sim.sharesHeld}/${sim.shares}`], ["Deployed", `$${sim.totalDeployed.toFixed(0)}`]].map(([l, v]) => (
                            <div key={l} style={{ background: "rgba(0,0,0,.3)", borderRadius: 7, padding: "7px 8px" }}>
                              <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                              <div style={{ fontSize: 12, fontFamily: "monospace", color: "#c8d8e8" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6, marginBottom: 8 }}>
                          {[["T1", sim.t1, sim.t1Hit], ["T2", sim.t2, sim.t2Hit], ["T3", sim.t3, sim.t3Hit]].map(([l, v, hit]) => v ? (
                            <div key={l} style={{ background: hit ? "rgba(0,229,160,.08)" : "rgba(0,0,0,.3)", borderRadius: 7, padding: "6px 8px", border: hit ? `1px solid ${G}44` : `1px solid transparent` }}>
                              <div style={{ fontSize: 8, fontFamily: "monospace", color: hit ? G : "#2a4050", textTransform: "uppercase", marginBottom: 2 }}>{l} {hit ? "✓" : ""}</div>
                              <div style={{ fontSize: 11, fontFamily: "monospace", color: hit ? G : "#8899bb" }}>${parseFloat(v).toFixed(2)}</div>
                            </div>
                          ) : null)}
                        </div>
                        <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
                          {[["Soft Stop", sim.softStop, sim.softStopHit, Y], ["Hard Stop", sim.hardStop, false, R]].map(([l, v, hit, c]) => v ? (
                            <div key={l} style={{ flex: 1, background: hit ? `${c}11` : "rgba(0,0,0,.3)", borderRadius: 7, padding: "6px 8px" }}>
                              <div style={{ fontSize: 8, fontFamily: "monospace", color: c, textTransform: "uppercase", marginBottom: 2 }}>{l}{hit ? " ⚡" : ""}</div>
                              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#8899bb" }}>${parseFloat(v).toFixed(2)}</div>
                            </div>
                          ) : null)}
                        </div>
                        <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "8px 10px", maxHeight: 110, overflowY: "auto", marginBottom: 8 }}>
                          <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Event Log</div>
                          {[...sim.log].reverse().map((e, i) => (
                            <div key={i} style={{ display: "flex", gap: 8, marginBottom: 4, fontSize: 11, fontFamily: "monospace" }}>
                              <span style={{ color: "#2a4050", flexShrink: 0, fontSize: 10 }}>{e.time}</span>
                              <span style={{ color: e.type === "target" ? G : e.type === "stop" ? R : e.type === "soft" ? Y : "#6677aa" }}>{e.msg}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#162030", alignSelf: "center" }}>Updated: {sim.lastUpdated}</div>
                          <div style={{ flex: 1 }} />
                          <button onClick={() => manualCloseSim(sim, "MANUAL_WIN")} style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(0,229,160,.1)", border: `1px solid ${G}44`, color: G, padding: "4px 9px", borderRadius: 5, cursor: "pointer" }}>✓ Win</button>
                          <button onClick={() => manualCloseSim(sim, "BAILOUT")} style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(245,200,66,.08)", border: `1px solid ${Y}44`, color: Y, padding: "4px 9px", borderRadius: 5, cursor: "pointer" }}>⚡ Bailout</button>
                          <button onClick={() => manualCloseSim(sim, "MANUAL_LOSS")} style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(255,68,102,.08)", border: `1px solid ${R}44`, color: R, padding: "4px 9px", borderRadius: 5, cursor: "pointer" }}>✗ Loss</button>
                        </div>
                      </div>
  );
                  })}
                </div>
              )}

              {/* HISTORY TAB */}
              {simHistTab === "history" && (
                <div style={{display:"contents"}}>
                  {simHistory.length === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a4050", fontFamily: "monospace", fontSize: 12 }}>No closed trades yet. Results will appear here automatically.</div>}
                  {[...simHistory].reverse().map((sim, i) => {
                    const pnl = parseFloat(sim.pnl);
                    const outcomeColor = sim.outcome === "WIN" ? G : sim.outcome === "PARTIAL_WIN" ? B : sim.outcome === "BAILOUT" ? Y : R;
                    const outcomeIcon = sim.outcome === "WIN" ? "🏆" : sim.outcome === "PARTIAL_WIN" ? "✅" : sim.outcome === "BAILOUT" ? "⚡" : "❌";
                    return (
                      <div key={sim.id} style={{ background: S2, border: `1px solid ${outcomeColor}22`, borderRadius: 10, padding: "12px 14px", marginBottom: 10, borderLeft: `3px solid ${outcomeColor}` }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 16 }}>{outcomeIcon}</span>
                            <span style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 16, color: "#fff" }}>{sim.sym}</span>
                            <span style={{ fontSize: 9, fontFamily: "monospace", padding: "2px 7px", borderRadius: 4, background: `${outcomeColor}22`, color: outcomeColor, border: `1px solid ${outcomeColor}44` }}>{sim.outcome?.replace("_", " ")}</span>
                          </div>
                          <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: pnl >= 0 ? G : R }}>{pnl >= 0 ? "+" : ""}${pnl}</div>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                          {[["Entry", `$${parseFloat(sim.entry).toFixed(2)}`], ["Exit", sim.closedAt ? `$${sim.closedAt.toFixed ? sim.closedAt.toFixed(2) : sim.closedAt}` : "—"], ["Closed", sim.closedTime || "—"]].map(([l, v]) => (
                            <div key={l} style={{ background: "rgba(0,0,0,.3)", borderRadius: 6, padding: "5px 8px" }}>
                              <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", marginBottom: 1 }}>{l}</div>
                              <div style={{ fontSize: 11, fontFamily: "monospace", color: "#8899bb" }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: "#162030", marginTop: 6 }}>{sim.archivedAt}</div>
                      </div>
  );
                  })}
                  {simHistory.length > 0 && <button onClick={() => { if (window.confirm("Clear all history?")) setSimHistory([]); }} style={{ width: "100%", padding: "8px", borderRadius: 8, background: "transparent", border: `1px solid ${BOR}`, color: "#2a4050", fontSize: 11, cursor: "pointer", fontFamily: "monospace", marginTop: 4 }}>🗑 Clear History</button>}
                </div>
              )}

              {/* STATS / ANALYTICS TAB */}
              {simHistTab === "stats" && (
                <div style={{display:"contents"}}>
                  {total === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a4050", fontFamily: "monospace", fontSize: 12 }}>No data yet. Complete some simulations to see analytics.</div>}
                  {total > 0 && (
                    <div style={{display:"contents"}}>
                      {/* Win Rate Gauge */}
                      <div style={{ background: "linear-gradient(135deg,rgba(0,229,160,.07),rgba(0,170,255,.04))", border: `1px solid rgba(0,229,160,.2)`, borderRadius: 12, padding: "18px", marginBottom: 14, textAlign: "center" }}>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>APEX Tool Success Rate</div>
                        <div style={{ fontSize: 52, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: parseFloat(winRate) >= 60 ? G : parseFloat(winRate) >= 40 ? Y : R, lineHeight: 1 }}>{winRate}%</div>
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: "#4a6070", marginTop: 4 }}>Win Rate across {total} closed trade{total !== 1 ? "s" : ""}</div>
                        <div style={{ marginTop: 14, background: "rgba(0,0,0,.3)", borderRadius: 6, height: 8, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${winRate}%`, background: parseFloat(winRate) >= 60 ? G : parseFloat(winRate) >= 40 ? Y : R, borderRadius: 6, transition: "width 1s ease" }} />
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 3 }}>
                          <span style={{ fontSize: 9, fontFamily: "monospace", color: R }}>0%</span>
                          <span style={{ fontSize: 9, fontFamily: "monospace", color: Y }}>50%</span>
                          <span style={{ fontSize: 9, fontFamily: "monospace", color: G }}>100%</span>
                        </div>
                      </div>

                      {/* Score Cards */}
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 14 }}>
                        {[
                          { l: "Total Trades", v: total, c: "#c8d8e8" },
                          { l: "Net P&L", v: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, c: totalPnl >= 0 ? G : R },
                          { l: "Wins 🏆", v: wins.length, c: G },
                          { l: "Losses ❌", v: losses.length, c: R },
                          { l: "Bailouts ⚡", v: bailouts.length, c: Y },
                          { l: "Current Streak", v: `${streak.cur} ${streak.type === "W" ? "W 🔥" : "L 🥶"}`, c: streak.type === "W" ? G : R },
                          { l: "Avg Win", v: avgWin !== "—" ? `+$${avgWin}` : "—", c: G },
                          { l: "Avg Loss", v: avgLoss !== "—" ? `$${avgLoss}` : "—", c: R },
                        ].map(({ l, v, c }) => (
                          <div key={l} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "10px 12px" }}>
                            <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{l}</div>
                            <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: c }}>{v}</div>
                          </div>
                        ))}
                      </div>

                      {/* Best / Worst */}
                      {bestTrade && <div style={{ background: "rgba(0,229,160,.05)", border: `1px solid rgba(0,229,160,.15)`, borderRadius: 10, padding: "11px 14px", marginBottom: 8 }}>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: G, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🏆 Best Trade</div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 14, color: "#c8d8e8" }}>{bestTrade.sym}</span>
                          <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: G }}>+${parseFloat(bestTrade.pnl).toFixed(2)}</span>
                        </div>
                      </div>}
                      {worstTrade && <div style={{ background: "rgba(255,68,102,.05)", border: `1px solid rgba(255,68,102,.15)`, borderRadius: 10, padding: "11px 14px", marginBottom: 14 }}>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: R, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>❌ Worst Trade</div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span style={{ fontFamily: "monospace", fontSize: 14, color: "#c8d8e8" }}>{worstTrade.sym}</span>
                          <span style={{ fontFamily: "monospace", fontSize: 14, fontWeight: 700, color: R }}>${parseFloat(worstTrade.pnl).toFixed(2)}</span>
                        </div>
                      </div>}

                      {/* Outcome Breakdown Bar */}
                      <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 10, padding: "12px 14px" }}>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Outcome Breakdown</div>
                        {[["Wins", wins.length, G], ["Bailouts", bailouts.length, Y], ["Losses", losses.length, R]].map(([l, n, c]) => (
                          <div key={l} style={{ marginBottom: 8 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                              <span style={{ fontSize: 10, fontFamily: "monospace", color: c }}>{l}</span>
                              <span style={{ fontSize: 10, fontFamily: "monospace", color: "#4a6070" }}>{n} ({total ? (n / total * 100).toFixed(0) : 0}%)</span>
                            </div>
                            <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 4, height: 6, overflow: "hidden" }}>
                              <div style={{ height: "100%", width: `${total ? (n / total * 100) : 0}%`, background: c, borderRadius: 4, transition: "width .8s ease" }} />
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Tool Verdict */}
                      <div style={{ marginTop: 12, background: "rgba(0,0,0,.3)", borderRadius: 10, padding: "12px 14px", border: `1px solid ${BOR}` }}>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>APEX Tool Verdict</div>
                        <div style={{ fontSize: 12, fontFamily: "monospace", color: parseFloat(winRate) >= 70 ? G : parseFloat(winRate) >= 50 ? Y : R, lineHeight: 1.6 }}>
                          {parseFloat(winRate) >= 70 ? `✅ PERFORMING WELL — ${winRate}% win rate confirms APEX setups are highly reliable. The tool is working.` :
                           parseFloat(winRate) >= 50 ? `⚠️ MODERATE — ${winRate}% win rate is above breakeven but needs improvement. Review losing setups for patterns.` :
                           `❌ UNDERPERFORMING — ${winRate}% win rate is below 50%. Review entry criteria and market conditions before trusting setups.`}
                        </div>
                      </div>

                      {/* R-Multiple Analysis */}
                      {total >= 3 && avgWin !== "—" && avgLoss !== "—" && (
                        <div style={{ marginTop: 12, background: S2, border: `1px solid ${BOR}`, borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>R-Multiple Analysis — <GlossaryTip term="R-Multiple">what is R?</GlossaryTip></div>
                          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                            <div style={{ background: "rgba(0,229,160,.07)", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                              <div style={{ fontSize: 8, fontFamily: "monospace", color: G, textTransform: "uppercase", marginBottom: 4 }}>Avg Win R</div>
                              <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: G }}>+{(parseFloat(avgWin) / (parseFloat(avgLoss || "1") * -1)).toFixed(1)}R</div>
                            </div>
                            <div style={{ background: "rgba(255,68,102,.07)", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                              <div style={{ fontSize: 8, fontFamily: "monospace", color: R, textTransform: "uppercase", marginBottom: 4 }}>Avg Loss R</div>
                              <div style={{ fontSize: 16, fontFamily: "monospace", fontWeight: 700, color: R }}>-1.0R</div>
                            </div>
                          </div>
                          <div style={{ marginTop: 8, fontSize: 11, fontFamily: "monospace", color: "#4a6070", textAlign: "center" }}>
                            Expectancy: {((wins.length/total) * (parseFloat(avgWin)/Math.abs(parseFloat(avgLoss||"1"))) - (1 - wins.length/total)).toFixed(2)}R per trade
                          </div>
                        </div>
                      )}

                      {/* AI Debrief */}
                      <button onClick={() => qp(`Based on my trading history — ${total} trades, ${winRate}% win rate, avg win $${avgWin}, avg loss $${avgLoss} — give me a complete post-trade AI debrief. What patterns do you see? What should I change? What am I doing right? Be specific and actionable.`)} style={{ width: "100%", padding: "9px", borderRadius: 9, background: "rgba(0,229,160,.08)", border: `1px solid rgba(0,229,160,.2)`, color: G, fontSize: 11, cursor: "pointer", fontFamily: "monospace", marginTop: 12 }}>
                        🤖 Get AI Performance Debrief
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* WEEKLY REPORT TAB */}
              {simHistTab === "report" && (
                <div style={{display:"contents"}}>
                  <div style={{ background: "linear-gradient(135deg,rgba(0,229,160,.07),rgba(0,170,255,.04))", border: `1px solid rgba(0,229,160,.2)`, borderRadius: 12, padding: "16px", marginBottom: 14 }}>
                    <div style={{ fontSize: 9, fontFamily: "monospace", color: G, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>📋 Weekly Performance Report</div>
                    {total === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "#2a4050", fontFamily: "monospace", fontSize: 11 }}>Complete some simulations to generate your weekly report.</div>
                    ) : (
                      <div style={{display:"contents"}}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginBottom: 12 }}>
                          {[{ l: "This Week", v: total + " trades", c: "#c8d8e8" }, { l: "Net P&L", v: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(0)}`, c: totalPnl >= 0 ? G : R }, { l: "Win Rate", v: `${winRate}%`, c: parseFloat(winRate) >= 60 ? G : Y }].map(({ l, v, c }) => (
                            <div key={l} style={{ background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "10px", textAlign: "center" }}>
                              <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", marginBottom: 4 }}>{l}</div>
                              <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: c }}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{ marginBottom: 10, fontSize: 11, color: "#4a6070", lineHeight: 1.7 }}>
                          <strong style={{ color: "#c8d8e8" }}>🏆 Best Trade:</strong> {bestTrade ? `${bestTrade.sym} (+$${parseFloat(bestTrade.pnl).toFixed(0)})` : "None"}<br/>
                          <strong style={{ color: "#c8d8e8" }}>❌ Worst Trade:</strong> {worstTrade ? `${worstTrade.sym} ($${parseFloat(worstTrade.pnl).toFixed(0)})` : "None"}<br/>
                          <strong style={{ color: "#c8d8e8" }}>🔥 Current Streak:</strong> {streak.cur} {streak.type === "W" ? "wins" : "losses"} in a row
                        </div>
                        <button onClick={() => qp(`Generate my complete weekly trading report. Stats: ${total} trades, ${winRate}% win rate, net P&L $${totalPnl.toFixed(0)}, avg win $${avgWin}, avg loss $${avgLoss}. Best: ${bestTrade?.sym || "none"} (+$${parseFloat(bestTrade?.pnl || 0).toFixed(0)}). What worked, what didn't, what to focus on next week?`)} style={{ width: "100%", padding: "9px", borderRadius: 9, background: "rgba(0,229,160,.1)", border: `1px solid rgba(0,229,160,.25)`, color: G, fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>
                          ⬡ Generate AI Weekly Report
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Memory insights */}
                  {(() => {
                    const insights = getMemoryInsights();
                    if (!insights) return <div style={{ textAlign: "center", padding: "20px", color: "#2a4050", fontFamily: "monospace", fontSize: 11 }}>Complete 3+ trades to unlock pattern analysis.</div>;
                    return (
                      <div style={{ background: "rgba(0,170,255,.05)", border: "1px solid rgba(0,170,255,.2)", borderRadius: 12, padding: "14px" }}>
                        <div style={{ fontSize: 9, fontFamily: "monospace", color: B, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>🧠 Your Personal Patterns</div>
                        <div style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.8 }}>
                          <div>Win Rate: <span style={{ color: parseInt(insights.wr) > 60 ? G : Y, fontFamily: "monospace", fontWeight: 700 }}>{insights.wr}%</span> across {insights.count} trades</div>
                          {insights.bestFG && <div>Best entries when Fear&Greed near <span style={{ color: G, fontFamily: "monospace" }}>{insights.bestFG}</span></div>}
                          {insights.bestSession && <div>Most wins during <span style={{ color: G, fontFamily: "monospace" }}>{insights.bestSession}</span> sessions</div>}
                        </div>
                      </div>
  );
                  })()}
                </div>
              )}
            </div>
  );
        })()}
        {view === "risk" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff", marginBottom: 4 }}>Risk Calculator</div>
            <div style={{ fontSize: 11, color: "#2a4050", marginBottom: 16, fontFamily: "monospace" }}>Size every position correctly. Never risk more than 1-2% per trade.</div>
            <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 12, padding: "16px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Account Size ($)</div><Inp type="number" value={riskVal.account} onChange={e => setRiskVal(p => ({ ...p, account: e.target.value }))} style={{ marginBottom: 0 }} /></div>
                <div><div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Risk Per Trade (%)</div><Inp type="number" value={riskVal.risk} onChange={e => setRiskVal(p => ({ ...p, risk: e.target.value }))} style={{ marginBottom: 0 }} /></div>
                <div><div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Entry Price ($)</div><Inp type="number" value={riskVal.entry} onChange={e => setRiskVal(p => ({ ...p, entry: e.target.value }))} style={{ marginBottom: 0 }} /></div>
                <div><div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}>Stop Loss ($)</div><Inp type="number" value={riskVal.stop} onChange={e => setRiskVal(p => ({ ...p, stop: e.target.value }))} style={{ marginBottom: 0 }} /></div>
              </div>
              <button onClick={calcRisk} style={{ width: "100%", padding: "10px", borderRadius: 9, background: G, border: "none", color: "#000", fontSize: 12, cursor: "pointer", fontWeight: 700, fontFamily: "monospace", marginTop: 12 }}>Calculate Position Size</button>
            </div>
            {riskResult && <div style={{ background: "linear-gradient(135deg,rgba(0,229,160,.06),rgba(0,170,255,.04))", border: `1px solid rgba(0,229,160,.2)`, borderRadius: 12, padding: "16px", marginTop: 12, animation: "fadeUp .3s ease" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[{ l: "Shares to Buy", v: riskResult.shares, c: "#fff" }, { l: "Position Size", v: `$${parseFloat(riskResult.posSize).toLocaleString()}`, c: "#e8f4ff" }, { l: "% of Account", v: `${riskResult.posPct}%`, c: parseFloat(riskResult.posPct) > 10 ? R : Y }, { l: "Max Dollar Risk", v: `$${riskResult.dollarRisk}`, c: R }].map(s => (
                  <div key={s.l} style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "10px 12px" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{s.l}</div>
                    <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, color: s.c }}>{s.v}</div>
                  </div>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: "9px 12px", background: "rgba(0,0,0,.3)", borderRadius: 8, fontSize: 11, color: "#6677aa", fontFamily: "monospace" }}>Buy {riskResult.shares} shares. Max loss at stop = ${riskResult.dollarRisk} exactly.</div>
            </div>}
            <div style={{ marginTop: 16, background: S2, border: `1px solid ${BOR}`, borderRadius: 12, padding: "14px 16px" }}>
              {["Never risk more than 1-2% of account per trade", "Scale into positions across 2-3 tranches", "Always set stop loss BEFORE entering", "Target minimum 2:1 R/R — ideally 3:1 or better", "Cut losses quickly, let winners run", "Never put more than 5-8% in a single stock"].map((r, i) => (
                <div key={i} style={{ display: "flex", gap: 8, marginBottom: 7 }}><span style={{ color: G, fontSize: 10, flexShrink: 0, marginTop: 2 }}>◆</span><span style={{ fontSize: 12, color: "#6677aa", lineHeight: 1.6 }}>{r}</span></div>
              ))}
            </div>
          </div>
        )}

      {/* end SimPanel */}
  </>
  );
}
