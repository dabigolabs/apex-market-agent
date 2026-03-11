import { useState } from 'react';

function PreflightPanel({ score, onLaunchSim }) {
  const G = "#00e5a0", R = "#ff4466", Y = "#f5c842", B = "#00aaff";
  const [expanded, setExpanded] = useState(false);
  if (!score) return null;
  const catColors = { TECH: B, FUND: Y, MACRO: G, SENT: "#a78bfa" };
  const catLabels = { TECH: "Technical", FUND: "Fundamental", MACRO: "Macro", SENT: "Sentiment" };
  return (
    <div style={{ background: "rgba(0,0,0,.3)", border: `1px solid ${score.verdictColor}33`, borderRadius: 12, padding: "14px", marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 2, marginBottom: 3 }}>Pre-Flight Score</div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontFamily: "monospace", fontSize: 28, fontWeight: 700, color: score.verdictColor }}>{score.score}</span>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#4a6070" }}>/100</span>
            <span style={{ fontSize: 9, fontFamily: "monospace", padding: "3px 9px", borderRadius: 20, background: `${score.verdictColor}22`, color: score.verdictColor, border: `1px solid ${score.verdictColor}44` }}>{score.verdict}</span>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", marginBottom: 3 }}>Recommended Size</div>
          <div style={{ fontFamily: "monospace", fontSize: 20, fontWeight: 700, color: score.verdictColor }}>{score.posSize}</div>
        </div>
      </div>
      <div style={{ height: 6, background: "rgba(0,0,0,.4)", borderRadius: 4, overflow: "hidden", marginBottom: 10 }}>
        <div style={{ height: "100%", width: `${score.score}%`, background: `linear-gradient(90deg,${score.verdictColor},${score.score > 70 ? G : score.verdictColor})`, borderRadius: 4, transition: "width 1s ease" }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 5, marginBottom: 8 }}>
        {["TECH","FUND","MACRO","SENT"].map(cat => {
          const catItems = (score.details||[]).filter(d => d.cat === cat);
          const catTotal = catItems.reduce((a, d) => a + d.pts, 0);
          const catMax = cat === "TECH" ? 40 : 20;
          return (
            <div key={cat} style={{ background: "rgba(0,0,0,.3)", borderRadius: 7, padding: "7px 8px", textAlign: "center" }}>
              <div style={{ fontSize: 8, fontFamily: "monospace", color: catColors[cat], textTransform: "uppercase", letterSpacing: 1, marginBottom: 3 }}>{catLabels[cat]}</div>
              <div style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#c8d8e8" }}>{catTotal}<span style={{ fontSize: 9, color: "#2a4050" }}>/{catMax}</span></div>
            </div>
          );
        })}
      </div>
      <button onClick={() => setExpanded(v => !v)} style={{ width: "100%", padding: "5px", borderRadius: 6, background: "transparent", border: "1px solid #1e3040", color: "#2a4050", fontSize: 10, cursor: "pointer", fontFamily: "monospace", marginBottom: expanded ? 8 : 0 }}>
        {expanded ? "▲ Hide Breakdown" : "▼ Show Scoring Breakdown"}
      </button>
      {expanded && (
        <div style={{ maxHeight: 200, overflowY: "auto" }}>
          {(score.details||[]).map((d, i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.03)" }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontFamily: "monospace", color: d.pass ? "#c8d8e8" : "#4a6070" }}>{d.label}</div>
                <div style={{ fontSize: 9, color: "#2a4050" }}>{d.note}</div>
              </div>
              <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: d.pts > 0 ? G : R, minWidth: 24, textAlign: "right" }}>{d.pts > 0 ? `+${d.pts}` : "0"}</div>
            </div>
          ))}
        </div>
      )}
      {onLaunchSim && score.score >= 55 && (
        <button onClick={onLaunchSim} style={{ width: "100%", padding: "9px", borderRadius: 8, background: `linear-gradient(90deg,${G},${B})`, border: "none", color: "#000", fontSize: 11, cursor: "pointer", fontWeight: 700, fontFamily: "monospace", marginTop: 8 }}>
          ▶ Launch Simulation from This Setup
        </button>
      )}
    </div>
  );
}

const GLOSSARY = {
  "Stop Loss": "Your safety exit price. If the stock falls here, you sell to prevent bigger losses. Think of it as your emergency exit door.",
  "Hard Stop": "Absolute maximum loss you will accept. If price hits this, exit the entire position immediately — no exceptions.",
  "Soft Stop": "Early warning level. When price reaches this, sell half and reassess. Protects profits while staying in the trade.",
  "Target": "Your planned profit-taking price. You sell shares here to lock in gains.",
  "Tranche": "Instead of buying all at once, you split your purchase into smaller buys at different prices. Protects you if price dips further after your first buy.",
  "VWAP": "Volume Weighted Average Price. If price is above VWAP, buyers are in control. Below VWAP, sellers dominate. Resets every day.",
  "RSI": "Relative Strength Index (0-100). Below 30 = oversold potential bounce. Above 70 = overbought potential pullback. 40-65 is the sweet spot for buying.",
  "MACD": "Shows momentum by comparing two moving averages. MACD above zero = bullish momentum. Below zero = bearish momentum.",
  "200MA": "200-Day Moving Average — the most watched technical level on Wall Street. Price above = long-term uptrend. Price below = long-term downtrend.",
  "Golden Cross": "When the 50-day moving average crosses above the 200-day. One of the strongest long-term buy signals used by institutions.",
  "Conviction": "How confident APEX is on a scale of 1-10. Based on how many indicators align. 8 or higher means very strong setup.",
  "Risk/Reward": "Ratio of potential gain to potential loss. 3:1 means for every $1 you risk, you could gain $3. Professional traders aim for 3:1 minimum.",
  "Bollinger Bands": "Price envelopes showing when a stock is stretched too far from its average. Touching the lower band often signals a bounce is coming.",
  "Pre-Flight Score": "APEX 100-point composite check: Technical 40pts + Fundamental 20pts + Macro 20pts + Sentiment 20pts. Like a pilot pre-flight checklist.",
  "Bear Case": "The strongest argument AGAINST this trade. APEX always considers both sides — this is the devil advocate view.",
  "R-Multiple": "Standardized trade result measurement. 1R equals your risk amount. A 3R win means you made 3x what you risked.",
  "Scale-In Zone": "The price range where you execute your tranches. Buying across this range means you are not trying to catch the perfect bottom.",
  "Market Mood": "The overall emotional state of the market. RISK-ON means investors are buying confidently. RISK-OFF means they are scared and selling.",
};

export function GlossaryTip({ term, children }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline" }}>
      <span onClick={() => setShow(v => !v)} style={{ borderBottom: "1px dashed rgba(0,170,255,.5)", cursor: "pointer", color: "#8899bb" }}>{children || term}</span>
      {show && (
        <div onClick={() => setShow(false)} style={{ position: "absolute", zIndex: 100, bottom: "calc(100% + 6px)", left: 0, width: 240, background: "#0a1520", border: "1px solid rgba(0,170,255,.3)", borderRadius: 9, padding: "10px 12px", boxShadow: "0 8px 32px rgba(0,0,0,.8)", cursor: "pointer" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: "#00aaff", fontFamily: "monospace", marginBottom: 5 }}>{term}</div>
          <div style={{ fontSize: 11, color: "#8899bb", lineHeight: 1.6 }}>{GLOSSARY[term] || "No definition available."}</div>
          <div style={{ fontSize: 9, color: "#2a4050", marginTop: 5, fontFamily: "monospace" }}>tap to close</div>
        </div>
      )}
    </span>
  );
}

export function SetupCard({ s, onLaunchSim, preflightScore }) {
  const [tab, setTab] = useState("action");
  const [showFull, setShowFull] = useState(false);
  const G = "#00e5a0", R = "#ff4466", Y = "#f5c842", B = "#00aaff";
  const prob = parseInt(s.prob) || 80;
  const conv = parseInt(s.conviction) || 8;
  const goColor = s.goStatus && s.goStatus.includes("GO") ? (s.goStatus.includes("NO") ? R : s.goStatus.includes("WAIT") ? Y : G) : G;
  const Row = ({ l, v, c, tip }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <span style={{ fontSize: 11, color: "#4a6070", fontFamily: "monospace" }}>{tip ? <GlossaryTip term={tip}>{l}</GlossaryTip> : l}</span>
      <span style={{ fontSize: 12, fontWeight: 600, color: c || "#e8f4ff", fontFamily: "monospace" }}>{v}</span>
    </div>
  );
  const Bullets = ({ text }) => (text || "").split("\n").filter(l => l.trim().startsWith("•")).map((l, i) => (
    <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6 }}>
      <span style={{ color: G, flexShrink: 0, fontSize: 10, marginTop: 2 }}>◆</span>
      <span style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.6 }}>{l.replace("•", "").trim()}</span>
    </div>
  ));
  return (
    <div style={{ background: "linear-gradient(160deg,#080f1a,#060c14)", border: "1px solid #1a2e40", borderRadius: 14, overflow: "hidden", marginTop: 10 }}>
      <div style={{ background: "linear-gradient(90deg,rgba(0,229,160,.1),rgba(0,170,255,.07))", borderBottom: "1px solid #1a2e40", padding: "16px 20px", position: "relative" }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${goColor},${B},transparent)` }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <span style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{s.ticker}</span>
              <span style={{ background: `${goColor}22`, border: `1px solid ${goColor}44`, color: goColor, fontSize: 9, fontFamily: "monospace", padding: "3px 8px", borderRadius: 20 }}>{s.goStatus || "PERFECT SETUP"}</span>
            </div>
            <div style={{ fontSize: 12, color: "#8899bb" }}>{s.company}</div>
            <div style={{ fontSize: 10, color: "#3a5060", fontFamily: "monospace" }}>{s.sector}{s.preflightScore ? ` · Score: ${s.preflightScore}` : ""}</div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: "#3a5060", fontFamily: "monospace", marginBottom: 3 }}>SUCCESS RATE</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: G, fontFamily: "monospace", lineHeight: 1 }}>{s.prob}</div>
            <div style={{ marginTop: 6, height: 3, width: 90, background: "#0d1e2a", borderRadius: 4, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${prob}%`, background: `linear-gradient(90deg,${G},${B})`, borderRadius: 4 }} />
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 4, marginTop: 12, alignItems: "center" }}>
          {Array.from({ length: 10 }, (_, i) => (<div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < conv ? (i < 7 ? G : Y) : "#0d1e2a" }} />))}
          <span style={{ fontSize: 9, color: "#3a5060", fontFamily: "monospace", whiteSpace: "nowrap", marginLeft: 6 }}>CONVICTION {s.conviction}</span>
        </div>
      </div>

      {s.tldr && (
        <div style={{ background: `linear-gradient(135deg,${goColor}12,rgba(0,0,0,.4))`, borderBottom: "1px solid #0d1a24", padding: "14px 20px" }}>
          <div style={{ fontSize: 9, fontFamily: "monospace", color: goColor, textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>⚡ INSTANT ACTION — WHAT TO DO RIGHT NOW</div>
          <div style={{ fontSize: 14, color: "#fff", fontWeight: 600, lineHeight: 1.6, marginBottom: 10 }}>{s.tldr}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 6 }}>
            {[{ l: "Entry", v: s.entry, c: G }, { l: "Hard Stop", v: s.hardStop, c: R }, { l: "Target 1", v: s.t1 ? s.t1.split(" ")[0] : "—", c: B }].map(({ l, v, c }) => (
              <div key={l} style={{ background: "rgba(0,0,0,.4)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${c}22` }}>
                <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 13, fontFamily: "monospace", fontWeight: 700, color: c }}>{v || "—"}</div>
              </div>
            ))}
            {[{ l: "R/R Ratio", v: s.rr, c: G }, { l: "Hold", v: s.daysToHold, c: Y }, { l: "Mood", v: s.marketMood, c: s.marketMood === "RISK-ON" ? G : s.marketMood === "RISK-OFF" ? R : Y }].map(({ l, v, c }) => (
              <div key={l} style={{ background: "rgba(0,0,0,.4)", borderRadius: 8, padding: "8px 10px", border: `1px solid ${c}22` }}>
                <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", marginBottom: 2 }}>{l}</div>
                <div style={{ fontSize: 11, fontFamily: "monospace", fontWeight: 700, color: c }}>{v || "—"}</div>
              </div>
            ))}
          </div>
          {s.topRisk && <div style={{ marginTop: 10, background: "rgba(255,68,102,.08)", borderRadius: 8, padding: "8px 12px", border: "1px solid rgba(255,68,102,.2)" }}><span style={{ fontSize: 9, fontFamily: "monospace", color: R, textTransform: "uppercase", letterSpacing: 1 }}>⚠ TOP RISK: </span><span style={{ fontSize: 11, color: "#8899bb" }}>{s.topRisk}</span></div>}
          {s.timeSensitivity && <div style={{ marginTop: 6, fontSize: 10, fontFamily: "monospace", color: "#4a6070" }}>⏱ {s.timeSensitivity}</div>}
        </div>
      )}

      <div style={{ display: "flex", borderBottom: "1px solid #0d1a24", overflowX: "auto" }}>
        {[{ id: "action", l: "📍 Setup" }, { id: "analysis", l: "🧠 Analysis" }, { id: "scenarios", l: "🎯 Scenarios" }, { id: "exit", l: "📊 Targets" }, { id: "risk", l: "🛡 Risk" }, { id: "cat", l: "⚡ Info" }].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ flexShrink: 0, padding: "8px 10px", textAlign: "center", fontSize: 9, fontFamily: "monospace", cursor: "pointer", color: tab === t.id ? G : "#3a5060", borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent", background: tab === t.id ? "rgba(0,229,160,.04)" : "transparent", transition: ".15s" }}>{t.l}</div>
        ))}
      </div>
      <div style={{ padding: "14px 20px" }}>
        {tab === "action" && <div>
          <Row l="IDEAL ENTRY" v={s.entry} c={G} tip="Scale-In Zone" />
          <Row l="SCALE-IN ZONE" v={s.scaleZone} c={Y} tip="Scale-In Zone" />
          <Row l="POSITION SIZE" v={s.posSize} c="#e8f4ff" tip="Conviction" />
          {s.tranches && <div style={{ marginTop: 10, background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "10px 13px", fontFamily: "monospace", fontSize: 11, color: "#8899bb", lineHeight: 1.8 }}>
            <div style={{ fontSize: 9, color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 5 }}><GlossaryTip term="Tranche">TRANCHES — tap to learn</GlossaryTip></div>
            {s.tranches}
          </div>}
          {s.quality && <div style={{ marginTop: 10 }}><div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: "#3a5060", textTransform: "uppercase", marginBottom: 6 }}>BUSINESS QUALITY</div><p style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.65, margin: 0 }}>{s.quality}</p></div>}
          {preflightScore && <div style={{ marginTop: 12 }}><PreflightPanel score={preflightScore} onLaunchSim={onLaunchSim} /></div>}
        </div>}

        {tab === "analysis" && <div>
          {s.whyNow && <div style={{ marginBottom: 12 }}><div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 6 }}>WHY NOW</div><p style={{ fontSize: 12.5, color: "#8899bb", lineHeight: 1.7, margin: 0 }}>{s.whyNow}</p></div>}
          {s.chainOfThought && <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: B, textTransform: "uppercase", marginBottom: 8 }}>🔗 CHAIN OF THOUGHT</div>
            {s.chainOfThought.split("|").map((step, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 6, alignItems: "flex-start" }}>
                <div style={{ width: 18, height: 18, borderRadius: "50%", background: `${B}22`, border: `1px solid ${B}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9, fontFamily: "monospace", color: B, flexShrink: 0 }}>{i + 1}</div>
                <div style={{ fontSize: 11, color: "#8899bb", lineHeight: 1.6 }}>{step.trim()}</div>
              </div>
            ))}
          </div>}
          {s.bearCase && <div style={{ background: "rgba(255,68,102,.06)", border: "1px solid rgba(255,68,102,.2)", borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: R, textTransform: "uppercase", marginBottom: 6 }}>🐻 <GlossaryTip term="Bear Case">DEVIL'S ADVOCATE — BEAR CASE</GlossaryTip></div>
            <p style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.65, margin: 0 }}>{s.bearCase}</p>
          </div>}
        </div>}

        {tab === "scenarios" && <div>
          <div style={{ fontSize: 10, fontFamily: "monospace", color: "#4a6070", marginBottom: 12 }}>Three possible outcomes — know your plan for each before entering.</div>
          {[{ label: "BULL SCENARIO", text: s.scenarioBull, color: G, icon: "🟢" }, { label: "BASE SCENARIO", text: s.scenarioBase, color: Y, icon: "🟡" }, { label: "BEAR SCENARIO", text: s.scenarioBear, color: R, icon: "🔴" }].map(({ label, text, color, icon }) => text ? (
            <div key={label} style={{ marginBottom: 10, background: `${color}08`, borderRadius: 10, padding: "12px 14px", border: `1px solid ${color}22` }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", color, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>{icon} {label}</div>
              <p style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.65, margin: 0 }}>{text}</p>
            </div>
          ) : null)}
          {s.keyAlert && <div style={{ background: "rgba(245,200,66,.07)", border: "1px solid rgba(245,200,66,.2)", borderRadius: 8, padding: "10px 12px", marginTop: 4 }}>
            <div style={{ fontSize: 9, fontFamily: "monospace", color: Y, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>🔔 KEY ALERT LEVEL</div>
            <div style={{ fontSize: 12, color: "#8899bb" }}>{s.keyAlert}</div>
          </div>}
        </div>}

        {tab === "exit" && <div>
          {[{ l: "TARGET 1", v: s.t1, c: G }, { l: "TARGET 2", v: s.t2, c: B }, { l: "TARGET 3 — LET RUN", v: s.t3, c: "#a78bfa" }].map(t => (
            <div key={t.l} style={{ marginBottom: 10, background: "rgba(0,0,0,.3)", borderRadius: 9, padding: "11px 13px", borderLeft: `3px solid ${t.c}` }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: t.c, marginBottom: 4 }}><GlossaryTip term="Target">{t.l}</GlossaryTip></div>
              <div style={{ fontSize: 12, color: "#c8d8e8", fontFamily: "monospace" }}>{t.v}</div>
            </div>
          ))}
          <Row l="RISK/REWARD" v={s.rr} c={G} tip="Risk/Reward" />
          <Row l="MAX GAIN ($10k)" v={s.maxGain} c={G} />
          <Row l="MAX LOSS ($10k)" v={s.maxLoss} c={R} />
        </div>}

        {tab === "risk" && <div>
          <div style={{ marginBottom: 10, background: "rgba(255,68,102,.07)", borderRadius: 9, padding: "11px 13px", border: "1px solid rgba(255,68,102,.18)" }}>
            <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: R, marginBottom: 4 }}><GlossaryTip term="Hard Stop">HARD STOP — EXIT ALL</GlossaryTip></div>
            <div style={{ fontSize: 13, color: R, fontFamily: "monospace", fontWeight: 700 }}>{s.hardStop}</div>
          </div>
          <div style={{ marginBottom: 12, background: "rgba(245,200,66,.06)", borderRadius: 9, padding: "11px 13px", border: "1px solid rgba(245,200,66,.18)" }}>
            <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: Y, marginBottom: 4 }}><GlossaryTip term="Soft Stop">SOFT STOP — REASSESS</GlossaryTip></div>
            <div style={{ fontSize: 13, color: Y, fontFamily: "monospace", fontWeight: 700 }}>{s.softStop}</div>
          </div>
          <Bullets text={s.risks} />
        </div>}

        {tab === "cat" && <div>
          <Bullets text={s.catalysts} />
          {s.monitor && <div style={{ marginTop: 10 }}><div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: "#3a5060", textTransform: "uppercase", marginBottom: 8 }}>MONITOR</div><Bullets text={s.monitor} /></div>}
        </div>}
      </div>
      <div style={{ borderTop: "1px solid #0d1a24", padding: "10px 20px" }}>
        <button onClick={() => setShowFull(v => !v)} style={{ width: "100%", padding: "7px", borderRadius: 8, background: "transparent", border: "1px solid #1e3040", color: "#3a5060", fontSize: 10, cursor: "pointer", fontFamily: "monospace" }}>
          {showFull ? "▲ Hide Full Breakdown" : "📖 Full Breakdown — tap for complete analysis"}
        </button>
        {showFull && <div style={{ marginTop: 10, padding: "12px", background: "rgba(0,0,0,.3)", borderRadius: 10, fontSize: 12, color: "#8899bb", lineHeight: 1.8 }}>
          {s.whyNow && <p><strong style={{ color: "#c8d8e8" }}>Why Now:</strong> {s.whyNow}</p>}
          {s.chainOfThought && <p><strong style={{ color: "#c8d8e8" }}>Reasoning:</strong> {s.chainOfThought}</p>}
          {s.bearCase && <p><strong style={{ color: R }}>Bear Case:</strong> {s.bearCase}</p>}
          {s.quality && <p><strong style={{ color: "#c8d8e8" }}>Business:</strong> {s.quality}</p>}
        </div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SCAN ALERT CARD
// ─────────────────────────────────────────────────────────────
export function ScanCard({ a, onAct, onFav, onDismiss }) {
  const G = "#00e5a0", R = "#ff4466", Y = "#f5c842";
  const cols = { HIGH: [R, "rgba(255,68,102,.1)", "rgba(255,68,102,.22)"], MEDIUM: [Y, "rgba(245,200,66,.08)", "rgba(245,200,66,.2)"], LOW: [G, "rgba(0,229,160,.07)", "rgba(0,229,160,.18)"] };
  const icons = { OPPORTUNITY: "🎯", WARNING: "⚠️", NEWS: "📰", TECHNICAL: "📊" };
  const [c, bg, bord] = cols[a.urgency] || cols.MEDIUM;
  return (
    <div style={{ background: a.favorited ? "rgba(245,200,66,.06)" : bg, border: `1px solid ${a.favorited ? "rgba(245,200,66,.35)" : bord}`, borderRadius: 12, padding: "14px 16px", marginBottom: 10, animation: "fadeUp .4s ease", position: "relative", opacity: a.dismissed ? 0.35 : 1 }}>
      {a.favorited && <div style={{ position: "absolute", top: 8, right: 36, fontSize: 12 }}>⭐</div>}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{icons[a.type] || "⬡"}</span>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", marginBottom: 3 }}>
            <span style={{ fontSize: 8, fontFamily: "monospace", letterSpacing: 2, color: c, textTransform: "uppercase" }}>{a.type}</span>
            <span style={{ fontSize: 8, fontFamily: "monospace", background: c + "22", color: c, padding: "1px 6px", borderRadius: 10, border: `1px solid ${c}44` }}>{a.urgency}</span>
            {a.ticker && a.ticker !== "MARKET" && <span style={{ fontSize: 9, fontFamily: "monospace", color: "#fff", background: "rgba(255,255,255,.08)", padding: "1px 6px", borderRadius: 4 }}>{a.ticker}</span>}
            <span style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", marginLeft: "auto" }}>{a.ts}</span>
          </div>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#fff" }}>{a.headline}</div>
        </div>
      </div>
      {!a.dismissed && <p style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.65, margin: "0 0 10px" }}>{a.detail}</p>}
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        {!a.dismissed && <div style={{ fontSize: 11, fontFamily: "monospace", color: c, background: c + "15", border: `1px solid ${c}33`, borderRadius: 6, padding: "5px 10px", flex: 1 }}>→ {a.action}</div>}
        {!a.dismissed && <button onClick={onAct} style={{ fontSize: 10, fontFamily: "monospace", background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.1)", borderRadius: 6, color: "#c8d8e8", padding: "5px 10px", cursor: "pointer" }}>Analyze →</button>}
        <button onClick={onFav} title={a.favorited ? "Unfavorite" : "Save signal"} style={{ fontSize: 14, background: "transparent", border: "none", cursor: "pointer", padding: "4px 6px", opacity: a.favorited ? 1 : 0.35 }}>⭐</button>
        <button onClick={onDismiss} title="Dismiss" style={{ fontSize: 12, background: "transparent", border: "none", cursor: "pointer", color: "#2a4050", padding: "4px 6px" }}>✕</button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  API KEY SETTINGS PANEL
// ─────────────────────────────────────────────────────────────
export function APISettings({ keys, onSave, onClose }) {
  const G = "#00e5a0", Y = "#f5c842", R = "#ff4466";
  const BG = "#040810", S1 = "#070e18", S2 = "#0b1622", BOR = "#162030";
  const [vals, setVals] = useState({ ...keys });
  const [show, setShow] = useState({});
  const [testing, setTesting] = useState({});
  const [results, setResults] = useState({});

  const testKey = async (provider) => {
    const key = vals[provider.id];
    if (!key) return;
    setTesting(t => ({ ...t, [provider.id]: true }));
    setResults(r => ({ ...r, [provider.id]: null }));
    try {
      const result = await provider.test(key);
      setResults(r => ({ ...r, [provider.id]: result ? { ok: true, msg: result } : { ok: false, msg: "Invalid key or no data returned" } }));
    } catch (e) {
      setResults(r => ({ ...r, [provider.id]: { ok: false, msg: e.message } }));
    }
    setTesting(t => ({ ...t, [provider.id]: false }));
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: S1, border: `1px solid ${BOR}`, borderRadius: 16, width: "100%", maxWidth: 580, maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "16px 20px", borderBottom: `1px solid ${BOR}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(0,229,160,.04)" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: "#fff" }}>⚙ API Key Manager</div>
            <div style={{ fontSize: 11, color: "#3a5060", fontFamily: "monospace", marginTop: 2 }}>Add keys anytime — APEX automatically uses the best available source</div>
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", color: "#3a5060", fontSize: 18, cursor: "pointer" }}>✕</button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: "14px 20px" }}>
          {API_REGISTRY.map(provider => (
            <div key={provider.id} style={{ background: S2, border: `1px solid ${vals[provider.id] ? "rgba(0,229,160,.2)" : BOR}`, borderRadius: 11, padding: "14px", marginBottom: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontWeight: 700, color: "#fff", fontSize: 13 }}>{provider.name}</span>
                    {provider.required && <span style={{ fontSize: 8, fontFamily: "monospace", background: "rgba(0,229,160,.1)", color: G, padding: "2px 6px", borderRadius: 4, border: `1px solid rgba(0,229,160,.2)` }}>RECOMMENDED</span>}
                    {vals[provider.id] && <span style={{ fontSize: 8, fontFamily: "monospace", color: G }}>● Connected</span>}
                  </div>
                  <div style={{ fontSize: 11, color: "#6677aa", marginTop: 2 }}>{provider.label} — {provider.description}</div>
                  <div style={{ fontSize: 10, color: "#2a4050", fontFamily: "monospace", marginTop: 3 }}>{provider.freeInfo}</div>
                </div>
                <a href={provider.signupUrl} target="_blank" rel="noreferrer" style={{ fontSize: 10, color: G, fontFamily: "monospace", textDecoration: "none", border: `1px solid rgba(0,229,160,.2)`, padding: "3px 8px", borderRadius: 5, whiteSpace: "nowrap", flexShrink: 0 }}>Get Key →</a>
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type={show[provider.id] ? "text" : "password"}
                    placeholder={provider.placeholder}
                    value={vals[provider.id] || ""}
                    onChange={e => setVals(v => ({ ...v, [provider.id]: e.target.value }))}
                    style={{ width: "100%", padding: "7px 32px 7px 10px", borderRadius: 7, border: `1px solid ${BOR}`, background: BG, color: "#c8d8e8", fontFamily: "monospace", fontSize: 11 }}
                  />
                  <button onClick={() => setShow(s => ({ ...s, [provider.id]: !s[provider.id] }))} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", background: "transparent", border: "none", color: "#3a5060", cursor: "pointer", fontSize: 12 }}>{show[provider.id] ? "🙈" : "👁"}</button>
                </div>
                <button onClick={() => testKey(provider)} disabled={!vals[provider.id] || testing[provider.id]}
                  style={{ padding: "7px 12px", borderRadius: 7, border: `1px solid ${BOR}`, background: "transparent", color: testing[provider.id] ? Y : "#6677aa", fontSize: 10, cursor: "pointer", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                  {testing[provider.id] ? "Testing..." : "Test"}
                </button>
              </div>
              {results[provider.id] && (
                <div style={{ marginTop: 7, fontSize: 10, fontFamily: "monospace", color: results[provider.id].ok ? G : R, background: results[provider.id].ok ? "rgba(0,229,160,.07)" : "rgba(255,68,102,.07)", padding: "5px 9px", borderRadius: 6 }}>
                  {results[provider.id].ok ? "✓ " : "✗ "}{results[provider.id].msg}
                </div>
              )}
            </div>
          ))}
        </div>
        <div style={{ padding: "12px 20px", borderTop: `1px solid ${BOR}`, display: "flex", gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: "9px", borderRadius: 8, border: `1px solid ${BOR}`, background: "transparent", color: "#556677", fontSize: 12, cursor: "pointer", fontFamily: "monospace" }}>Cancel</button>
          <button onClick={() => { onSave(vals); onClose(); }} style={{ flex: 2, padding: "9px", borderRadius: 8, border: `1px solid ${G}`, background: G, color: "#000", fontSize: 12, cursor: "pointer", fontFamily: "monospace", fontWeight: 700 }}>Save All Keys</button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  MAIN APP
// ─────────────────────────────────────────────────────────────