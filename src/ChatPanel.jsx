import { useRef, useEffect } from 'react';
import { mdRender } from './scoring';
import { GlossaryTip, SetupCard } from './components';

export function ChatPanel({ BOR, S1, S2, chatEnd, earningsData, fundamentals, hasKey, indicators, input, launchSimFromSetup, loading, messages, onImg, pendingImg, preflightScore, prices, qp, send, setInput, setPendingImg, setShowSettings, view }) {
  return (<>
        {view === "chat" && <>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            {messages.length === 0 && (
              <div style={{ background: "linear-gradient(160deg,rgba(0,229,160,.05),rgba(0,170,255,.03))", border: `1px solid rgba(0,229,160,.12)`, borderRadius: 16, padding: "20px 22px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg,transparent,${G},transparent)` }} />
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 2, color: "#fff", marginBottom: 4 }}>APEX <span style={{ color: G }}>v11</span></div>
                <div style={{ fontSize: 12, color: "#3a5060", lineHeight: 1.75, marginBottom: 14, maxWidth: 500 }}>
                  {!hasKey ? <span style={{ color: Y }}>⚡ Add your Finnhub API key to enable live prices. Click <strong style={{ color: Y, cursor: "pointer" }} onClick={() => setShowSettings(true)}>⚙ Setup</strong> in the top right.</span>
                    : <span>Powered by <strong style={{ color: G }}>institutional-grade intelligence</strong> — live data, technical indicators, global markets, pre-flight scoring, and AI memory. Tap any underlined term for a plain-English explanation.</span>}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 7 }}>
                  {[{ i: "⬡", t: "Perfect Setup", p: "Using live data, find today's perfect buying opportunity — 80%+ probability, full structured setup." },
                  { i: "🌐", t: "Macro Read", p: "Using live data, complete macro analysis — Fed, yields, inflation, top 3 equity risks." },
                  { i: "🎯", t: "3 Best Trades", p: "Using live prices, give me 3 highest-conviction setups right now with full entry/exit details." },
                  { i: "🔄", t: "Sector Rotation", p: "Where is institutional money flowing right now? Sectors to overweight and underweight?" },
                  { i: "⚡", t: "Risk Scan", p: "What are the biggest risks to my capital right now? What should I hedge?" },
                  { i: "📊", t: "Chart Upload", p: "" },
                  ].map(q => (
                    <div key={q.t} className="cc" onClick={() => q.p && qp(q.p)} style={{ background: "rgba(255,255,255,.02)", border: `1px solid ${BOR}`, borderRadius: 10, padding: "11px 12px", cursor: q.p ? "pointer" : "default", transition: ".2s" }}>
                      <div style={{ fontSize: 17, marginBottom: 5 }}>{q.i}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: "#c8d8e8", marginBottom: 2 }}>{q.t}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {messages.map((m, i) => {
              const setup = m.role === "assistant" ? parsePerfectSetup(m.text) : null;
              return m.role === "user" ? (
                <div key={i} style={{ display: "flex", justifyContent: "flex-end", marginBottom: 14, animation: "fadeUp .3s ease" }}>
                  <div style={{ background: "rgba(0,170,255,.09)", border: "1px solid rgba(0,170,255,.16)", borderRadius: "14px 14px 3px 14px", padding: "10px 14px", maxWidth: "65%", fontSize: 13, lineHeight: 1.65 }}>
                    {m.image && <div style={{ fontSize: 10, color: "#2a4050", marginBottom: 4 }}>📎 {m.image.name}</div>}
                    {m.text.replace(/\[LIVE DATA[^\]]*\].*?\[NEWS\][^\n]*\n\n/s, "")}
                  </div>
                </div>
              ) : (
                <div key={i} style={{ display: "flex", gap: 9, marginBottom: 16, animation: "fadeUp .3s ease" }}>
                  <div style={{ width: 27, height: 27, background: `linear-gradient(135deg,${G},${B})`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0, marginTop: 2 }}>⬡</div>
                  <div style={{ background: S1, border: `1px solid ${BOR}`, borderRadius: "3px 14px 14px 14px", padding: "12px 16px", maxWidth: "84%", fontSize: 13, lineHeight: 1.7 }}>
                    <div style={{ fontFamily: "monospace", fontSize: 8, color: G, letterSpacing: 2, marginBottom: 9, textTransform: "uppercase" }}>⬡ APEX · LIVE ANALYSIS</div>
                    {setup ? <div>
                      <p style={{ fontSize: 12, color: "#6677aa", marginBottom: 6 }}>Live data analyzed — {setup.prob} probability setup identified:</p>
                      <SetupCard
                        s={setup}
                        onLaunchSim={() => launchSimFromSetup(setup)}
                        preflightScore={preflightScore}
                      />
                      {setup.ticker && (
                        <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden", border: "1px solid #1a2e40" }}>
                          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", background: "#070e18", padding: "6px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span>📈 LIVE CHART — {setup.ticker}</span>
                            <span style={{ color: "#1a2e40" }}>TradingView</span>
                          </div>
                          <iframe
                            src={`https://www.tradingview.com/widgetembed/?frameElementId=tv${setup.ticker}&symbol=${setup.ticker}&interval=D&hidesidetoolbar=1&hidetoptoolbar=0&symboledit=1&saveimage=0&toolbarbg=070e18&studies=RSI%40tv-basicstudies%2CMACD%40tv-basicstudies%2CMA%40tv-basicstudies&theme=dark&style=1&timezone=exchange&withdateranges=1&showpopupbutton=1&locale=en&utm_source=apex`}
                            style={{ width: "100%", height: 320, border: "none", background: "#040810" }}
                            title={`${setup.ticker} chart`}
                          />
                        </div>
                      )}
                      {setup.ticker && fundamentals[setup.ticker] && (
                        <div style={{ marginTop: 10, background: "#070e18", border: "1px solid #1a2e40", borderRadius: 10, padding: "12px 14px" }}>
                          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>📊 FUNDAMENTALS — {setup.ticker}</div>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
                            {[
                              { l: "P/E Ratio", v: fundamentals[setup.ticker].pe },
                              { l: "Revenue Growth", v: fundamentals[setup.ticker].revenueGrowth ? `+${fundamentals[setup.ticker].revenueGrowth}%` : null },
                              { l: "Profit Margin", v: fundamentals[setup.ticker].profitMargin ? `${fundamentals[setup.ticker].profitMargin}%` : null },
                              { l: "Debt/Equity", v: fundamentals[setup.ticker].debtToEquity },
                              { l: "Market Cap", v: fundamentals[setup.ticker].marketCap ? `$${fundamentals[setup.ticker].marketCap}` : null },
                              { l: "52W High", v: fundamentals[setup.ticker].week52High ? `$${fundamentals[setup.ticker].week52High}` : null },
                            ].filter(x => x.v).map(({ l, v }) => (
                              <div key={l} style={{ background: "rgba(0,0,0,.3)", borderRadius: 7, padding: "7px 9px" }}>
                                <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                                <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: "#c8d8e8" }}>{v}</div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {setup.ticker && earningsData[setup.ticker] && (
                        <div style={{ marginTop: 8, background: earningsData[setup.ticker].daysAway < 7 ? "rgba(255,68,102,.08)" : "rgba(245,200,66,.05)", border: `1px solid ${earningsData[setup.ticker].daysAway < 7 ? "rgba(255,68,102,.3)" : "rgba(245,200,66,.2)"}`, borderRadius: 8, padding: "8px 12px" }}>
                          <span style={{ fontSize: 9, fontFamily: "monospace", color: earningsData[setup.ticker].daysAway < 7 ? "#ff4466" : "#f5c842", textTransform: "uppercase" }}>📅 EARNINGS: </span>
                          <span style={{ fontSize: 11, color: "#8899bb" }}>{earningsData[setup.ticker].date} — {earningsData[setup.ticker].daysAway} days away</span>
                          {earningsData[setup.ticker].daysAway < 7 && <span style={{ marginLeft: 8, fontSize: 10, color: "#ff4466", fontFamily: "monospace" }}>⚠ HIGH RISK — Consider waiting until after earnings</span>}
                        </div>
                      )}
                    </div> : <div dangerouslySetInnerHTML={{ __html: mdRender(m.text) }} />}
                  </div>
                </div>
              );
            })}
            {loading && <div style={{ display: "flex", gap: 9, marginBottom: 14 }}><div style={{ width: 27, height: 27, background: `linear-gradient(135deg,${G},${B})`, borderRadius: 7, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, flexShrink: 0 }}>⬡</div><div style={{ background: S1, border: `1px solid ${BOR}`, borderRadius: "3px 14px 14px 14px", padding: "10px 14px", display: "flex", gap: 4, alignItems: "center" }}>{[0, 1, 2].map(i => <div key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: G, animation: `tdot 1.2s ease ${i * .2}s infinite` }} />)}<span style={{ fontFamily: "monospace", fontSize: 10, color: "#2a4050", marginLeft: 6 }}>Analyzing with live data...</span></div></div>}
            <div ref={chatEnd} />
          </div>
          <div style={{ padding: "9px 16px 13px", borderTop: `1px solid ${BOR}`, background: "rgba(4,8,16,.97)" }}>
            <div style={{ display: "flex", gap: 5, marginBottom: 8, flexWrap: "wrap" }}>
              {[{ l: "📡 Sentiment", p: "Complete sentiment read — risk-on/risk-off across all asset classes with specific indicators." },
              { l: "⚡ Squeezes", p: "Top 3 short squeeze candidates right now with thesis, float %, and catalyst." },
              { l: "📅 Earnings", p: "Most market-moving earnings next 2 weeks — key metrics and positioning." },
              { l: "📉 Yields", p: "Analyze current 10Y yield — what it predicts for equities." },
              { l: "🌍 Global", p: "Top 3 international setups right now — specific ETFs to trade." },
              ].map(t => <button key={t.l} className="hovg" onClick={() => qp(t.p)} style={{ padding: "3px 10px", borderRadius: 20, border: `1px solid ${BOR}`, background: S2, color: "#2a4050", fontSize: 10, fontFamily: "monospace", cursor: "pointer", transition: ".15s", whiteSpace: "nowrap" }}>{t.l}</button>)}
            </div>
            {pendingImg && <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, background: S2, border: `1px solid ${BOR}`, borderRadius: 8, padding: "5px 10px", fontSize: 11, color: "#2a4050" }}><img src={pendingImg.preview} style={{ width: 32, height: 24, objectFit: "cover", borderRadius: 4 }} alt="" /><span style={{ flex: 1 }}>{pendingImg.name}</span><span onClick={() => setPendingImg(null)} style={{ cursor: "pointer", color: R }}>✕</span></div>}
            <div style={{ display: "flex", gap: 7, alignItems: "flex-end" }}>
              <button style={{ width: 37, height: 37, borderRadius: 9, border: `1px solid ${BOR}`, background: S2, color: "#2a4050", fontSize: 14, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative", overflow: "hidden" }}>📎<input type="file" accept="image/*" style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer" }} onChange={onImg} /></button>
              <textarea style={{ flex: 1, background: S2, border: `1px solid ${BOR}`, borderRadius: 9, padding: "9px 12px", color: "#c8d8e8", fontFamily: "inherit", fontSize: 13, resize: "none", minHeight: 37, maxHeight: 110, lineHeight: 1.5 }} value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px"; }} placeholder="Ask APEX anything — live data included automatically..." />
              <button className="pbtn" disabled={loading || (!input.trim() && !pendingImg)} onClick={() => send()} style={{ width: 37, height: 37, background: loading || (!input.trim() && !pendingImg) ? "#0c1824" : G, border: "none", borderRadius: 9, color: loading || (!input.trim() && !pendingImg) ? "#162030" : "#000", fontSize: 16, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, flexShrink: 0, transition: ".2s" }}>↑</button>
            </div>
          </div>
        </>}

        {/* SIGNALS */}
  </>);
}
