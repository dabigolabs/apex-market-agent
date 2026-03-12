

export function RiskPanel({ ctx }) {
  const { BOR, G, Inp, R, S1, S2, Sel, Y, apiKeys, backtestLoading, backtestResult, backtestSym, backtestType, qp, runBacktestHandler, setBacktestSym, setBacktestType, view } = ctx;
  return (<>
        {/* BACKTEST VIEW */}
        {view === "backtest" && (
          <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
            <div style={{ fontFamily: "monospace", fontSize: 9, letterSpacing: 3, color: "#2a4050", textTransform: "uppercase", marginBottom: 16 }}>Historical Setup Backtester</div>

            <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 11, padding: "14px", marginBottom: 14 }}>
              <div style={{ fontFamily: "monospace", fontSize: 8, color: G, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>Configure Backtest</div>
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#4a6070", marginBottom: 4 }}>Symbol</div>
                <Inp value={backtestSym} onChange={e => setBacktestSym(e.target.value.toUpperCase())} placeholder="e.g. AAPL, TSLA, SPY" />
              </div>
              <div style={{ marginBottom: 10 }}>
                <div style={{ fontFamily: "monospace", fontSize: 9, color: "#4a6070", marginBottom: 4 }}>Setup Type</div>
                <Sel value={backtestType} onChange={e => setBacktestType(e.target.value)}>
                  <option value="bullish_momentum">Bullish Momentum (RSI 50-70, MACD cross, above MAs)</option>
                  <option value="oversold_bounce">Oversold Bounce (RSI &lt;35, at lower BB)</option>
                  <option value="breakout">Volume Breakout (price breaks 20-day high + volume surge)</option>
                  <option value="golden_cross">Golden Cross (20MA crosses above 50MA)</option>
                  <option value="vwap_reclaim">VWAP Reclaim (price reclaims VWAP with volume)</option>
                  <option value="above_200ma">Above 200MA + RSI 45-65 + MACD Bull</option>
                </Sel>
              </div>
              <button
                onClick={runBacktestHandler}
                disabled={backtestLoading || !backtestSym || !apiKeys.finnhub}
                style={{ width: "100%", padding: "10px", borderRadius: 8, background: (!backtestSym || !apiKeys.finnhub) ? "rgba(0,229,160,.2)" : G, border: "none", color: "#000", fontSize: 11, cursor: "pointer", fontFamily: "monospace", fontWeight: 700, opacity: backtestLoading ? 0.6 : 1 }}
              >
                {backtestLoading ? "⏳ Scanning 500 days..." : "⌖ Run Historical Backtest"}
              </button>
              {!apiKeys.finnhub && <div style={{ fontSize: 9, fontFamily: "monospace", color: R, marginTop: 6, textAlign: "center" }}>⚠ Finnhub API key required</div>}
            </div>

            {backtestResult && backtestResult.summary && (
              <>
                {/* Summary Stats */}
                <div style={{ background: "rgba(0,229,160,.06)", border: "1px solid rgba(0,229,160,.2)", borderRadius: 11, padding: "14px", marginBottom: 12 }}>
                  <div style={{ fontFamily: "monospace", fontSize: 8, color: G, letterSpacing: 2, textTransform: "uppercase", marginBottom: 10 }}>📊 Backtest Results — {backtestSym}</div>
                  <div style={{ fontFamily: "monospace", fontSize: 13, color: G, fontWeight: 700, marginBottom: 4 }}>
                    This setup occurred <span style={{ fontSize: 18 }}>{backtestResult.summary.total}</span> times
                  </div>
                  <div style={{ fontFamily: "monospace", fontSize: 12, color: parseInt(backtestResult.summary.winRate) >= 60 ? G : parseInt(backtestResult.summary.winRate) >= 45 ? Y : R, fontWeight: 700, marginBottom: 10 }}>
                    Worked {backtestResult.summary.wins}/{backtestResult.summary.total} = <span style={{ fontSize: 16 }}>{backtestResult.summary.winRate}% Win Rate</span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { l: "Avg 5-Day Change", v: `${backtestResult.summary.avgChg5d > 0 ? "+" : ""}${backtestResult.summary.avgChg5d}%`, c: parseFloat(backtestResult.summary.avgChg5d) > 0 ? G : R },
                      { l: "Avg Win (5d)", v: `+${backtestResult.summary.avgGain}%`, c: G },
                      { l: "Avg Loss (5d)", v: `${backtestResult.summary.avgLoss}%`, c: R },
                      { l: "Expectancy", v: `${backtestResult.summary.expectancy > 0 ? "+" : ""}${backtestResult.summary.expectancy}%`, c: parseFloat(backtestResult.summary.expectancy) > 0 ? G : R },
                      { l: "Data Points", v: `${backtestResult.summary.dataPoints} candles`, c: "#4a6070" },
                    ].map((item, i) => (
                      <div key={i} style={{ background: S1, borderRadius: 7, padding: "8px 10px" }}>
                        <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{item.l}</div>
                        <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: item.c }}>{item.v}</div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => qp(`Based on this backtest of ${backtestSym} using the ${backtestType.replace(/_/g, " ")} setup: ${backtestResult.summary.total} instances found, ${backtestResult.summary.winRate}% win rate, avg 5-day change ${backtestResult.summary.avgChg5d}%, expectancy ${backtestResult.summary.expectancy}%. Is this a statistically significant edge? What conditions make it work best? Should I trade this setup?`)}
                    style={{ width: "100%", marginTop: 10, padding: "8px", borderRadius: 8, background: "rgba(0,229,160,.08)", border: `1px solid rgba(0,229,160,.2)`, color: G, fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
                    🤖 Get AI Analysis of These Results
                  </button>
                </div>

                {/* Instance Table */}
                {backtestResult.instances.length > 0 && (
                  <div style={{ background: S2, border: `1px solid ${BOR}`, borderRadius: 11, padding: "12px" }}>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: "#2a4050", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 }}>Last {backtestResult.instances.length} Instances</div>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "monospace", fontSize: 10 }}>
                        <thead>
                          <tr style={{ color: "#2a4050" }}>
                            {["Date", "Entry", "RSI", "5d %", "10d %", "Max↑", "Max↓", ""].map((h, i) => (
                              <th key={i} style={{ padding: "4px 6px", textAlign: "left", fontWeight: 400, fontSize: 8, letterSpacing: 1, textTransform: "uppercase", borderBottom: `1px solid ${BOR}` }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[...backtestResult.instances].reverse().map((inst, i) => (
                            <tr key={i} style={{ borderBottom: `1px solid rgba(255,255,255,.03)` }}>
                              <td style={{ padding: "4px 6px", color: "#4a6070", fontSize: 9 }}>{inst.date}</td>
                              <td style={{ padding: "4px 6px", color: "#c8d8e8" }}>${inst.entryPrice}</td>
                              <td style={{ padding: "4px 6px", color: parseFloat(inst.rsi) > 60 ? Y : parseFloat(inst.rsi) < 40 ? G : "#c8d8e8" }}>{inst.rsi}</td>
                              <td style={{ padding: "4px 6px", color: parseFloat(inst.chg5d) > 0 ? G : R, fontWeight: 600 }}>{parseFloat(inst.chg5d) > 0 ? "+" : ""}{inst.chg5d}%</td>
                              <td style={{ padding: "4px 6px", color: parseFloat(inst.chg10d) > 0 ? G : R }}>{inst.chg10d !== "—" ? `${parseFloat(inst.chg10d) > 0 ? "+" : ""}${inst.chg10d}%` : "—"}</td>
                              <td style={{ padding: "4px 6px", color: G }}>+{inst.maxGain}%</td>
                              <td style={{ padding: "4px 6px", color: R }}>{inst.maxLoss}%</td>
                              <td style={{ padding: "4px 6px" }}><span style={{ display: "inline-block", padding: "1px 5px", borderRadius: 3, background: inst.win ? "rgba(0,229,160,.15)" : "rgba(255,68,102,.15)", color: inst.win ? G : R, fontSize: 8 }}>{inst.win ? "WIN" : "LOSS"}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </>
            )}

            {backtestResult && !backtestResult.summary && (
              <div style={{ background: "rgba(245,200,66,.07)", border: "1px solid rgba(245,200,66,.2)", borderRadius: 9, padding: "14px", textAlign: "center" }}>
                <div style={{ color: Y, fontFamily: "monospace", fontSize: 12, fontWeight: 600 }}>⚠ No Matching Setups Found</div>
                <div style={{ color: "#4a6070", fontFamily: "monospace", fontSize: 10, marginTop: 6 }}>Try a different setup type or symbol with more trading history.</div>
              </div>
            )}
        )}

      </div>
    </>);
}
