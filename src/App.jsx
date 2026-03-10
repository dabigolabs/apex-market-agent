import { useState, useRef, useEffect, useCallback } from "react";

// ─────────────────────────────────────────────────────────────
//  API KEY REGISTRY — add new providers here forever
// ─────────────────────────────────────────────────────────────
const API_REGISTRY = [
  {
    id: "finnhub",
    name: "Finnhub",
    label: "Stock Prices & News",
    description: "Live US stock prices, company news, earnings calendar",
    url: "https://finnhub.io",
    signupUrl: "https://finnhub.io/register",
    freeInfo: "Free — 60 calls/min, no credit card",
    placeholder: "e.g. abc123xyz...",
    required: true,
    test: async (key) => {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=SPY&token=${key}`);
      const d = await res.json();
      return d.c > 0 ? `SPY @ $${d.c}` : null;
    }
  },
  {
    id: "fred",
    name: "FRED",
    label: "Macro Data",
    description: "Live Fed rate, CPI, GDP, unemployment from St. Louis Fed",
    url: "https://fred.stlouisfed.org",
    signupUrl: "https://fred.stlouisfed.org/docs/api/api_key.html",
    freeInfo: "Free — unlimited calls, official government data",
    placeholder: "e.g. abcd1234efgh5678...",
    required: false,
    test: async (key) => {
      const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=FEDFUNDS&api_key=${key}&file_type=json&limit=1&sort_order=desc`);
      const d = await res.json();
      const val = d?.observations?.[0]?.value;
      return val ? `Fed Rate: ${val}%` : null;
    }
  },
  {
    id: "polygon",
    name: "Polygon.io",
    label: "Real-Time Prices",
    description: "True real-time tick data, options flow, institutional data",
    url: "https://polygon.io",
    signupUrl: "https://polygon.io/dashboard/signup",
    freeInfo: "Free tier available — real-time requires $29/mo",
    placeholder: "e.g. ABC123defGHI...",
    required: false,
    test: async (key) => {
      const res = await fetch(`https://api.polygon.io/v2/aggs/ticker/SPY/prev?apiKey=${key}`);
      const d = await res.json();
      return d.resultsCount > 0 ? `SPY prev close: $${d.results?.[0]?.c}` : null;
    }
  },
  {
    id: "alphavantage",
    name: "Alpha Vantage",
    label: "Fundamentals & Forex",
    description: "Company fundamentals, P/E ratios, forex, commodities",
    url: "https://www.alphavantage.co",
    signupUrl: "https://www.alphavantage.co/support/#api-key",
    freeInfo: "Free — 25 calls/day",
    placeholder: "e.g. ABCDEFGHIJ123456",
    required: false,
    test: async (key) => {
      const res = await fetch(`https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=SPY&apikey=${key}`);
      const d = await res.json();
      const price = d?.["Global Quote"]?.["05. price"];
      return price ? `SPY @ $${parseFloat(price).toFixed(2)}` : null;
    }
  },
  {
    id: "twelvedata",
    name: "Twelve Data",
    label: "International Markets",
    description: "Global stocks, ETFs, forex, crypto with CORS support",
    url: "https://twelvedata.com",
    signupUrl: "https://twelvedata.com/apikey",
    freeInfo: "Free — 800 calls/day",
    placeholder: "e.g. abc123def456...",
    required: false,
    test: async (key) => {
      const res = await fetch(`https://api.twelvedata.com/price?symbol=SPY&apikey=${key}`);
      const d = await res.json();
      return d.price ? `SPY @ $${parseFloat(d.price).toFixed(2)}` : null;
    }
  },
  {
    id: "anthropic",
    name: "Anthropic",
    label: "AI Analysis Engine",
    description: "Powers Perfect Setup, chat, and all AI analysis features",
    url: "https://console.anthropic.com",
    signupUrl: "https://console.anthropic.com/settings/keys",
    freeInfo: "~$0.01 per analysis — $5 free credits on signup",
    placeholder: "sk-ant-...",
    required: true,
    test: async (key) => {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
        body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 10, messages: [{ role: "user", content: "hi" }] })
      });
      const d = await res.json();
      return d.content ? "Connected ✓" : null;
    }
  },
];

// ─────────────────────────────────────────────────────────────
//  SYSTEM PROMPTS
// ─────────────────────────────────────────────────────────────
const APEX_SYSTEM = `You are APEX, the world's most elite institutional stock market intelligence agent — combining Warren Buffett, Ray Dalio, Stanley Druckenmiller, Paul Tudor Jones, and the top quant hedge funds.

EXPERTISE: US/International markets, DCF/fundamental analysis, all technical patterns, options Greeks, macro (Fed/yields/CPI/PMI), hedge fund KPIs (Sharpe/Sortino/VaR/Kelly), Buffett/Graham principles, market microstructure.

When asked for PERFECT SETUP respond ONLY in this format:
---PERFECT SETUP---
TICKER: [symbol]
COMPANY: [name]
SECTOR: [sector]
CONVICTION: [X/10]
SUCCESS PROBABILITY: [X%]
WHY NOW: [3-4 sentences — technical + fundamental confluence]
BUSINESS QUALITY: [2-3 sentences — moat, earnings, management]
IDEAL ENTRY: $[price]
SCALE-IN ZONE: $[low]–$[high]
POSITION SIZE: [X]% of portfolio
TRANCHES: Tranche 1 [X]% at $[price], Tranche 2 [X]% at $[price], Tranche 3 [X]% at $[price]
TARGET 1: $[price] (+[X]%) — [timeframe] — take [X]% off
TARGET 2: $[price] (+[X]%) — [timeframe] — take [X]% off
TARGET 3: $[price] (+[X]%) — [timeframe] — let [X]% run
HARD STOP: $[price] (-[X]%) — exit full position
SOFT STOP: $[price] (-[X]%) — reduce 50%
RISK/REWARD: [X]:1
MAX LOSS: $[X] on $10,000
MAX GAIN: $[X] on $10,000
CATALYSTS: • [item] • [item] • [item]
RISKS: • [item] • [item]
MONITOR: • [item] • [item]
---END SETUP---

For PROACTIVE SCAN respond ONLY in this format:
---SCAN ALERT---
TYPE: [OPPORTUNITY|WARNING|NEWS|TECHNICAL]
URGENCY: [HIGH|MEDIUM|LOW]
TICKER: [symbol or MARKET]
HEADLINE: [one punchy line]
DETAIL: [2-3 sentences of specific actionable detail]
ACTION: [exact recommended action]
---END SCAN---

For all other responses: be decisive, specific, quantified. Use BULLISH/BEARISH/NEUTRAL labels. Always include risk factors. Think like a top hedge fund PM.`;

const SCAN_PROMPT = `You are APEX running a proactive background market scan. Identify ONE of the following right now:
- A high-conviction buying opportunity (80%+ success probability)
- A major risk/warning that could hurt open positions
- A significant macro or news development worth acting on
- A technical breakout or breakdown in progress
Respond ONLY in the ---SCAN ALERT--- format. Be specific with tickers and prices. Make it genuinely actionable.`;

// ─────────────────────────────────────────────────────────────
//  DATA FETCHING
// ─────────────────────────────────────────────────────────────

// Finnhub — primary price source
async function fetchFinnhubPrice(symbol, apiKey) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    if (!d.c || d.c === 0) return null;
    const chg = ((d.c - d.pc) / d.pc) * 100;
    return { price: +d.c.toFixed(2), chg: +chg.toFixed(2), high: +d.h.toFixed(2), low: +d.l.toFixed(2), prev: +d.pc.toFixed(2), open: +d.o.toFixed(2) };
  } catch { return null; }
}

// Polygon.io — real-time if key available
async function fetchPolygonPrice(symbol, apiKey) {
  try {
    const res = await fetch(`https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    if (!d.results?.p) return null;
    return { price: +d.results.p.toFixed(2), chg: 0, high: 0, low: 0, prev: 0, open: 0, realtime: true };
  } catch { return null; }
}

// Twelve Data — international fallback
async function fetchTwelvePrice(symbol, apiKey) {
  try {
    const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    if (!d.price) return null;
    return { price: +parseFloat(d.price).toFixed(2), chg: 0, high: 0, low: 0, prev: 0, open: 0 };
  } catch { return null; }
}

// Smart fetch — uses best available key
async function fetchPrice(symbol, keys) {
  // Try Polygon first if available (most real-time)
  if (keys.polygon) {
    const d = await fetchPolygonPrice(symbol, keys.polygon);
    if (d) return { ...d, source: "POLYGON·RT" };
  }
  // Try Finnhub
  if (keys.finnhub) {
    const d = await fetchFinnhubPrice(symbol, keys.finnhub);
    if (d) return { ...d, source: "FINNHUB" };
  }
  // Try Twelve Data
  if (keys.twelvedata) {
    const d = await fetchTwelvePrice(symbol, keys.twelvedata);
    if (d) return { ...d, source: "TWELVE" };
  }
  return null;
}

async function fetchAllPrices(symbols, keys) {
  const results = {};
  await Promise.allSettled(symbols.map(async (sym) => {
    const d = await fetchPrice(sym, keys);
    if (d) results[sym] = d;
  }));
  return results;
}

// Finnhub news
async function fetchFinnhubNews(apiKey) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    const items = await res.json();
    return items.slice(0, 10).map(n => {
      const lower = n.headline.toLowerCase();
      const tag = lower.match(/\b(surge|rally|gain|rise|beat|record|growth|bull|jump|soar|up|strong)\b/) ? "bull"
        : lower.match(/\b(drop|fall|crash|loss|miss|decline|bear|down|weak|fear|risk|warn|slide|plunge)\b/) ? "bear" : "neut";
      return { src: n.source || "FINNHUB", title: n.headline, time: getTimeAgo(new Date(n.datetime * 1000)), tag, link: n.url };
    });
  } catch { return []; }
}

// RSS fallback news via proxy
async function fetchRSSNews() {
  const feeds = [
    { name: "REUTERS", url: "https://feeds.reuters.com/reuters/businessNews" },
    { name: "CNBC", url: "https://www.cnbc.com/id/100003114/device/rss/rss.html" },
  ];
  const items = [];
  await Promise.allSettled(feeds.map(async (feed) => {
    try {
      const res = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(feed.url)}`, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      const parser = new DOMParser();
      const xml = parser.parseFromString(data.contents, "text/xml");
      xml.querySelectorAll("item").forEach((item, i) => {
        if (i >= 3) return;
        const title = item.querySelector("title")?.textContent?.trim() || "";
        if (!title) return;
        const pubDate = item.querySelector("pubDate")?.textContent || "";
        const lower = title.toLowerCase();
        const tag = lower.match(/\b(surge|rally|gain|rise|beat|bull|jump|soar)\b/) ? "bull"
          : lower.match(/\b(drop|fall|crash|loss|miss|decline|bear|warn|slide)\b/) ? "bear" : "neut";
        items.push({ src: feed.name, title, time: pubDate ? getTimeAgo(new Date(pubDate)) : "recent", tag });
      });
    } catch {}
  }));
  return items;
}

// Fear & Greed
async function fetchFearGreed() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", { signal: AbortSignal.timeout(6000) });
    const d = await res.json();
    const val = d?.data?.[0];
    return val ? { value: parseInt(val.value), label: val.value_classification } : null;
  } catch { return null; }
}

// FRED macro
async function fetchFREDSeries(seriesId, apiKey) {
  try {
    const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    return d?.observations?.[0]?.value || null;
  } catch { return null; }
}

function getTimeAgo(date) {
  const mins = Math.floor((Date.now() - date) / 60000);
  if (isNaN(mins) || mins < 0) return "recent";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ─────────────────────────────────────────────────────────────
//  CONSTANTS
// ─────────────────────────────────────────────────────────────
const DEFAULT_WATCHLIST = [
  { sym: "SPY", name: "S&P 500 ETF" },
  { sym: "QQQ", name: "Nasdaq 100 ETF" },
  { sym: "NVDA", name: "NVIDIA Corp" },
  { sym: "AAPL", name: "Apple Inc" },
  { sym: "TSLA", name: "Tesla Inc" },
  { sym: "META", name: "Meta Platforms" },
  { sym: "AMZN", name: "Amazon.com" },
  { sym: "GLD", name: "Gold ETF" },
];
const MACRO_SYMS = ["^VIX", "^TNX", "DX-Y.NYB", "GC=F", "CL=F", "BTC-USD"];
const FINNHUB_MACRO = { "^VIX": "VIX", "^TNX": "TNX", "DX-Y.NYB": "DX-Y.NYB", "GC=F": "XAUUSD", "CL=F": "USOIL", "BTC-USD": "BINANCE:BTCUSDT" };

// ─────────────────────────────────────────────────────────────
//  PARSERS
// ─────────────────────────────────────────────────────────────
function parsePerfectSetup(text) {
  if (!text.includes("---PERFECT SETUP---")) return null;
  const g = (k) => { const m = text.match(new RegExp(k + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
  const gb = (s, e) => { const m = text.match(new RegExp(s + "\\n([\\s\\S]+?)(?=" + e + "|---END)")); return m ? m[1].trim() : ""; };
  return {
    ticker: g("TICKER"), company: g("COMPANY"), sector: g("SECTOR"),
    conviction: g("CONVICTION"), prob: g("SUCCESS PROBABILITY"),
    whyNow: g("WHY NOW"), quality: g("BUSINESS QUALITY"),
    entry: g("IDEAL ENTRY"), scaleZone: g("SCALE-IN ZONE"),
    posSize: g("POSITION SIZE"), tranches: g("TRANCHES"),
    t1: g("TARGET 1"), t2: g("TARGET 2"), t3: g("TARGET 3"),
    hardStop: g("HARD STOP"), softStop: g("SOFT STOP"),
    rr: g("RISK\\/REWARD"), maxLoss: g("MAX LOSS"), maxGain: g("MAX GAIN"),
    catalysts: gb("CATALYSTS:", "RISKS"), risks: gb("RISKS:", "MONITOR"), monitor: gb("MONITOR:", "---END"),
  };
}

function parseScanAlert(text) {
  if (!text.includes("---SCAN ALERT---")) return null;
  const g = (k) => { const m = text.match(new RegExp(k + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
  return { type: g("TYPE"), urgency: g("URGENCY"), ticker: g("TICKER"), headline: g("HEADLINE"), detail: g("DETAIL"), action: g("ACTION") };
}

function mdRender(text) {
  if (!text) return "";
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong style="color:#e8f4ff">$1</strong>')
    .replace(/^### (.+)$/gm, '<div style="font-size:10px;font-weight:700;color:#00e5a0;margin:12px 0 5px;letter-spacing:2px;text-transform:uppercase;font-family:monospace">$1</div>')
    .replace(/^## (.+)$/gm, '<div style="font-size:14px;font-weight:700;color:#fff;margin:12px 0 6px">$1</div>')
    .replace(/^[-•] (.+)$/gm, '<div style="padding:3px 0 3px 12px;border-left:2px solid #1a2e3a;margin:3px 0;color:#8899bb;font-size:12.5px">$1</div>')
    .replace(/BULLISH/g, '<span style="color:#00e5a0;font-weight:700;font-family:monospace;background:rgba(0,229,160,.1);padding:1px 6px;border-radius:4px">▲ BULLISH</span>')
    .replace(/BEARISH/g, '<span style="color:#ff4466;font-weight:700;font-family:monospace;background:rgba(255,68,102,.1);padding:1px 6px;border-radius:4px">▼ BEARISH</span>')
    .replace(/NEUTRAL/g, '<span style="color:#f5c842;font-weight:700;font-family:monospace;background:rgba(245,200,66,.1);padding:1px 6px;border-radius:4px">◆ NEUTRAL</span>')
    .replace(/\n\n/g, '<div style="height:9px"></div>').replace(/\n/g, '<br/>');
}

// ─────────────────────────────────────────────────────────────
//  SETUP CARD
// ─────────────────────────────────────────────────────────────
function SetupCard({ s }) {
  const [tab, setTab] = useState("entry");
  const G = "#00e5a0", R = "#ff4466", Y = "#f5c842", B = "#00aaff";
  const prob = parseInt(s.prob) || 80;
  const conv = parseInt(s.conviction) || 8;
  const Row = ({ l, v, c }) => (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "7px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
      <span style={{ fontSize: 11, color: "#4a6070", fontFamily: "monospace" }}>{l}</span>
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
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,${G},${B},transparent)` }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 3 }}>
              <span style={{ fontFamily: "monospace", fontSize: 26, fontWeight: 700, color: "#fff", letterSpacing: 2 }}>{s.ticker}</span>
              <span style={{ background: "rgba(0,229,160,.12)", border: "1px solid rgba(0,229,160,.3)", color: G, fontSize: 9, fontFamily: "monospace", padding: "3px 8px", borderRadius: 20 }}>PERFECT SETUP</span>
            </div>
            <div style={{ fontSize: 12, color: "#8899bb" }}>{s.company}</div>
            <div style={{ fontSize: 10, color: "#3a5060", fontFamily: "monospace" }}>{s.sector}</div>
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
          {Array.from({ length: 10 }, (_, i) => (
            <div key={i} style={{ flex: 1, height: 5, borderRadius: 3, background: i < conv ? (i < 7 ? G : Y) : "#0d1e2a" }} />
          ))}
          <span style={{ fontSize: 9, color: "#3a5060", fontFamily: "monospace", whiteSpace: "nowrap", marginLeft: 6 }}>CONVICTION {s.conviction}</span>
        </div>
      </div>
      {s.whyNow && <div style={{ padding: "12px 20px", borderBottom: "1px solid #0d1a24", background: "rgba(0,0,0,.2)" }}>
        <div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: G, textTransform: "uppercase", marginBottom: 6 }}>WHY NOW</div>
        <p style={{ fontSize: 12.5, color: "#8899bb", lineHeight: 1.7, margin: 0 }}>{s.whyNow}</p>
      </div>}
      <div style={{ display: "flex", borderBottom: "1px solid #0d1a24" }}>
        {[{ id: "entry", l: "📍 Entry" }, { id: "exit", l: "🎯 Targets" }, { id: "risk", l: "🛡 Risk" }, { id: "cat", l: "⚡ Catalysts" }].map(t => (
          <div key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: "9px 4px", textAlign: "center", fontSize: 10, fontFamily: "monospace", cursor: "pointer", color: tab === t.id ? G : "#3a5060", borderBottom: tab === t.id ? `2px solid ${G}` : "2px solid transparent", background: tab === t.id ? "rgba(0,229,160,.04)" : "transparent", transition: ".15s" }}>{t.l}</div>
        ))}
      </div>
      <div style={{ padding: "14px 20px" }}>
        {tab === "entry" && <div><Row l="IDEAL ENTRY" v={s.entry} c={G} /><Row l="SCALE-IN ZONE" v={s.scaleZone} c={Y} /><Row l="POSITION SIZE" v={s.posSize} /><div style={{ marginTop: 10, background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "10px 13px", fontFamily: "monospace", fontSize: 11, color: "#8899bb", lineHeight: 1.8 }}>{s.tranches}</div>{s.quality && <div style={{ marginTop: 10 }}><div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: "#3a5060", textTransform: "uppercase", marginBottom: 6 }}>BUSINESS QUALITY</div><p style={{ fontSize: 12, color: "#8899bb", lineHeight: 1.65, margin: 0 }}>{s.quality}</p></div>}</div>}
        {tab === "exit" && <div>{[{ l: "TARGET 1", v: s.t1, c: G }, { l: "TARGET 2", v: s.t2, c: B }, { l: "TARGET 3 — LET RUN", v: s.t3, c: "#a78bfa" }].map(t => <div key={t.l} style={{ marginBottom: 10, background: "rgba(0,0,0,.3)", borderRadius: 9, padding: "11px 13px", borderLeft: `3px solid ${t.c}` }}><div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: t.c, marginBottom: 4 }}>{t.l}</div><div style={{ fontSize: 12, color: "#c8d8e8", fontFamily: "monospace" }}>{t.v}</div></div>)}<Row l="RISK/REWARD" v={s.rr} c={G} /><Row l="MAX GAIN ($10k)" v={s.maxGain} c={G} /><Row l="MAX LOSS ($10k)" v={s.maxLoss} c={R} /></div>}
        {tab === "risk" && <div><div style={{ marginBottom: 10, background: "rgba(255,68,102,.07)", borderRadius: 9, padding: "11px 13px", border: "1px solid rgba(255,68,102,.18)" }}><div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: R, marginBottom: 4 }}>HARD STOP — EXIT ALL</div><div style={{ fontSize: 13, color: R, fontFamily: "monospace", fontWeight: 700 }}>{s.hardStop}</div></div><div style={{ marginBottom: 12, background: "rgba(245,200,66,.06)", borderRadius: 9, padding: "11px 13px", border: "1px solid rgba(245,200,66,.18)" }}><div style={{ fontSize: 9, fontFamily: "monospace", letterSpacing: 2, color: Y, marginBottom: 4 }}>SOFT STOP — REASSESS</div><div style={{ fontSize: 13, color: Y, fontFamily: "monospace", fontWeight: 700 }}>{s.softStop}</div></div><Bullets text={s.risks} /></div>}
        {tab === "cat" && <div><Bullets text={s.catalysts} /></div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
//  SCAN ALERT CARD
// ─────────────────────────────────────────────────────────────
function ScanCard({ a, onAct, onFav, onDismiss }) {
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
function APISettings({ keys, onSave, onClose }) {
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
export default function APEX() {
  const G = "#00e5a0", R = "#ff4466", Y = "#f5c842", B = "#00aaff";
  const BG = "#040810", S1 = "#070e18", S2 = "#0b1622", BOR = "#162030";

  const [view, setView] = useState("chat");
  const [rpTab, setRpTab] = useState("news");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [watchlist, setWatchlist] = useState(DEFAULT_WATCHLIST);
  const [prices, setPrices] = useState({});
  const [fearGreed, setFearGreed] = useState(null);
  const [news, setNews] = useState([]);
  const [fredData, setFredData] = useState({});
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [scanAlerts, setScanAlerts] = useState([]);
  const [notifCount, setNotifCount] = useState(0);
  const [scanActive, setScanActive] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [portfolio, setPortfolio] = useState([]);
  const [journal, setJournal] = useState([]);
  const [priceAlerts, setPriceAlerts] = useState([
    { id: 1, sym: "SPY", cond: "above", val: 520, label: "SPY crosses above $520", on: true, triggered: false },
    { id: 2, sym: "NVDA", cond: "pct_up", val: 5, label: "NVDA gains >5% in a day", on: true, triggered: false },
  ]);
  const [toasts, setToasts] = useState([]);
  const [pendingImg, setPendingImg] = useState(null);
  const [setupLoading, setSetupLoading] = useState(false);
  const [riskVal, setRiskVal] = useState({ account: "10000", risk: "1", entry: "", stop: "" });
  const [riskResult, setRiskResult] = useState(null);
  const [addWForm, setAddWForm] = useState(false);
  const [newW, setNewW] = useState({ sym: "", name: "" });
  const [addPForm, setAddPForm] = useState(false);
  const [newP, setNewP] = useState({ sym: "", shares: "", entry: "", notes: "" });
  const [journalForm, setJournalForm] = useState(false);
  const [newJ, setNewJ] = useState({ sym: "", entry: "", exit: "", shares: "", notes: "" });
  const [addAForm, setAddAForm] = useState(false);
  const [newA, setNewA] = useState({ sym: "", cond: "above", val: "" });
  const [showSettings, setShowSettings] = useState(false);
  const [apiKeys, setApiKeys] = useState({});
  const [signalFilter, setSignalFilter] = useState("all"); // all | favorited | unread
  const toastId = useRef(0);
  const alertId = useRef(30);
  const journalId = useRef(0);
  const scanTimer = useRef(null);
  const priceTimer = useRef(null);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // ── TOAST ──
  const toast = useCallback((title, msg, type = "info") => {
    const id = ++toastId.current;
    setToasts(t => [...t, { id, title, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 7000);
  }, []);

  // ── LOAD KEYS FROM LOCALSTORAGE ──
  useEffect(() => {
    try {
      const saved = localStorage.getItem("apex_api_keys");
      if (saved) {
        const keys = JSON.parse(saved);
        setApiKeys(keys);
        if (!keys.finnhub) setShowSettings(true); // auto-open if no Finnhub key
      } else {
        setShowSettings(true); // first time — show settings
      }
    } catch {}
  }, []);

  const saveKeys = useCallback((keys) => {
    setApiKeys(keys);
    localStorage.setItem("apex_api_keys", JSON.stringify(keys));
    toast("✓ API Keys Saved", "Refreshing market data...", "info");
    setTimeout(() => fetchAllData(keys), 500);
  }, []);

  // ── FETCH ALL DATA ──
  const fetchAllData = useCallback(async (keys = apiKeys) => {
    if (!keys.finnhub && !keys.polygon && !keys.twelvedata) return;
    setDataLoading(true);
    try {
      const allSyms = [...new Set([...watchlist.map(w => w.sym), ...MACRO_SYMS])];
      const priceData = await fetchAllPrices(allSyms, keys);
      setPrices(priceData);

      // News — use Finnhub if available, fallback to RSS
      const newsItems = keys.finnhub
        ? await fetchFinnhubNews(keys.finnhub)
        : await fetchRSSNews();
      if (newsItems.length) setNews(newsItems);

      // Fear & Greed
      const fg = await fetchFearGreed();
      if (fg) setFearGreed(fg);

      // FRED macro
      if (keys.fred) {
        const [cpi, ffr, gdp, unemp] = await Promise.all([
          fetchFREDSeries("CPIAUCSL", keys.fred),
          fetchFREDSeries("FEDFUNDS", keys.fred),
          fetchFREDSeries("A191RL1Q225SBEA", keys.fred),
          fetchFREDSeries("UNRATE", keys.fred),
        ]);
        setFredData({ cpi, ffr, gdp, unemp });
      }

      setLastUpdated(new Date());
      checkAlerts(priceData);
    } catch (e) { console.log("Data error:", e); }
    setDataLoading(false);
  }, [watchlist, apiKeys]);

  useEffect(() => {
    if (Object.keys(apiKeys).length === 0) return;
    fetchAllData();
    priceTimer.current = setInterval(() => fetchAllData(), 60000);
    return () => clearInterval(priceTimer.current);
  }, [apiKeys]);

  // ── CHECK PRICE ALERTS ──
  const checkAlerts = (priceData) => {
    setPriceAlerts(prev => prev.map(a => {
      if (!a.on || a.triggered) return a;
      const p = priceData[a.sym]; if (!p) return a;
      let triggered = false;
      if (a.cond === "above" && p.price > a.val) triggered = true;
      if (a.cond === "below" && p.price < a.val) triggered = true;
      if (a.cond === "pct_up" && p.chg > a.val) triggered = true;
      if (a.cond === "pct_dn" && p.chg < -a.val) triggered = true;
      if (triggered) { toast(`⚡ ALERT: ${a.sym}`, a.label, "bull"); return { ...a, triggered: true }; }
      return a;
    }));
  };

  // ── PROACTIVE SCANNER ──
  useEffect(() => {
    if (!scanActive) return;
    const runScan = async () => {
      setScanning(true);
      try {
        const priceCtx = Object.entries(prices).slice(0, 6).map(([s, d]) => `${s}:$${d.price}(${d.chg >= 0 ? "+" : ""}${d.chg}%)`).join(" ");
        const newsCtx = news.slice(0, 3).map(n => n.title).join("; ");
        const res = await fetch("https://api.anthropic.com/v1/messages", {
          method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKeys.anthropic || "", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" },
          body: JSON.stringify({ model: "claude-haiku-4-5-20251001", max_tokens: 400, system: APEX_SYSTEM, messages: [{ role: "user", content: `Live data: ${priceCtx || "markets open"}. News: ${newsCtx || "monitoring"}. ${SCAN_PROMPT}` }] })
        });
        const d = await res.json();
        const text = d.content?.map(b => b.text || "").join("") || "";
        const alert = parseScanAlert(text);
        if (alert) {
          const newAlert = { ...alert, id: Date.now(), ts: new Date().toLocaleTimeString(), favorited: false, dismissed: false, read: false };
          setScanAlerts(prev => [newAlert, ...prev.slice(0, 49)]);
          setNotifCount(n => n + 1);
          toast(`${alert.urgency === "HIGH" ? "🚨" : "⚡"} ${alert.headline}`, alert.ticker !== "MARKET" ? `${alert.ticker} — ${alert.action}` : alert.action, alert.urgency === "HIGH" ? "bear" : "bull");
        }
      } catch {}
      setScanning(false);
    };
    const t = setTimeout(runScan, 4000);
    scanTimer.current = setInterval(runScan, 300000);
    return () => { clearTimeout(t); clearInterval(scanTimer.current); };
  }, [scanActive, prices, news]);

  // ── SEND MESSAGE ──
  const send = async (text = input, img = pendingImg, skipClear = false) => {
    const t = text.trim(); if (!t && !img) return;
    if (!skipClear) { setInput(""); setPendingImg(null); }
    setLoading(true);
    setMessages(prev => [...prev, { role: "user", text: t, image: img }]);
    const content = [];
    if (img) content.push({ type: "image", source: { type: "base64", media_type: img.mediaType, data: img.base64 } });
    const priceCtx = Object.entries(prices).slice(0, 10).map(([s, d]) => `${s}:$${d.price}(${d.chg >= 0 ? "+" : ""}${d.chg}%)[${d.source || ""}]`).join(" ");
    const fgCtx = fearGreed ? `Fear&Greed:${fearGreed.value}(${fearGreed.label})` : "";
    const fredCtx = fredData.ffr ? `FedRate:${fredData.ffr}% CPI:${fredData.cpi} GDP:${fredData.gdp}% Unemp:${fredData.unemp}%` : "";
    const newsCtx = news.slice(0, 3).map(n => `[${n.src}] ${n.title}`).join(" | ");
    content.push({ type: "text", text: `[LIVE DATA @ ${lastUpdated?.toLocaleTimeString() || "now"}]: ${priceCtx} ${fgCtx} ${fredCtx}\n[NEWS]: ${newsCtx}\n\n${t || "Analyze this chart."}` });
    try {
      const hist = messages.slice(-8).map(m => ({ role: m.role, content: m.role === "user" ? (m.image ? [{ type: "image", source: { type: "base64", media_type: m.image.mediaType, data: m.image.base64 } }, { type: "text", text: m.text }] : m.text) : m.text }));
      const res = await fetch("https://api.anthropic.com/v1/messages", { method: "POST", headers: { "Content-Type": "application/json", "x-api-key": apiKeys.anthropic || "", "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }, body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, system: APEX_SYSTEM, messages: [...hist, { role: "user", content }] }) });
      const d = await res.json();
      const reply = d.content?.map(b => b.text || "").join("") || "No response.";
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", text: `**Error:** ${e.message}` }]); }
    setLoading(false);
  };

  const qp = (p) => { setView("chat"); send(p, null, true); };
  const perfectSetup = async () => { setSetupLoading(true); await send("Using live market data, give me today's single PERFECT buying opportunity — 80%+ success probability, full structured setup.", null, true); setSetupLoading(false); };
  const onImg = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPendingImg({ base64: ev.target.result.split(",")[1], mediaType: f.type, name: f.name, preview: ev.target.result }); r.readAsDataURL(f); };

  // ── SIGNAL ACTIONS ──
  const favSignal = (id) => setScanAlerts(prev => prev.map(a => a.id === id ? { ...a, favorited: !a.favorited } : a));
  const dismissSignal = (id) => { setScanAlerts(prev => prev.map(a => a.id === id ? { ...a, dismissed: true } : a)); };
  const clearDismissed = () => setScanAlerts(prev => prev.filter(a => !a.dismissed));
  const clearAll = () => { setScanAlerts([]); setNotifCount(0); };
  const markAllRead = () => { setScanAlerts(prev => prev.map(a => ({ ...a, read: true }))); setNotifCount(0); };

  const filteredAlerts = scanAlerts.filter(a => {
    if (signalFilter === "favorited") return a.favorited;
    if (signalFilter === "unread") return !a.read && !a.dismissed;
    return !a.dismissed || a.favorited;
  });

  const portStats = () => {
    if (!portfolio.length) return null;
    const tc = portfolio.reduce((s, p) => s + p.entry * p.shares, 0);
    const tv = portfolio.reduce((s, p) => { const c = prices[p.sym]; return s + (c ? c.price : p.entry) * p.shares; }, 0);
    const pnl = tv - tc;
    return { tc: tc.toFixed(2), tv: tv.toFixed(2), pnl: pnl.toFixed(2), pct: ((pnl / tc) * 100).toFixed(2) };
  };

  const jStats = () => {
    if (!journal.length) return null;
    const closed = journal.filter(j => j.exit);
    const wins = closed.filter(j => parseFloat(j.result) > 0);
    const totalPnl = closed.reduce((s, j) => s + parseFloat(j.result || 0), 0);
    return { trades: closed.length, wr: closed.length ? (wins.length / closed.length * 100).toFixed(0) : 0, totalPnl: totalPnl.toFixed(2), open: journal.filter(j => !j.exit).length };
  };

  const calcRisk = () => {
    const acc = parseFloat(riskVal.account) || 10000, rp = parseFloat(riskVal.risk) || 1, en = parseFloat(riskVal.entry) || 0, st = parseFloat(riskVal.stop) || 0;
    if (!en || !st) return;
    const rps = Math.abs(en - st), dr = (acc * rp) / 100, shares = Math.floor(dr / rps), ps = shares * en;
    setRiskResult({ shares, posSize: ps.toFixed(2), posPct: ((ps / acc) * 100).toFixed(1), dollarRisk: dr.toFixed(2) });
  };

  const addWatch = () => {
    if (!newW.sym.trim()) return;
    const sym = newW.sym.trim().toUpperCase();
    if (watchlist.find(w => w.sym === sym)) { toast("Already watching", sym, "info"); return; }
    setWatchlist(prev => [...prev, { sym, name: newW.name || sym }]);
    setNewW({ sym: "", name: "" }); setAddWForm(false);
    toast("✓ Added", `${sym} — fetching price...`, "info");
  };

  const pStats = portStats(); const js = jStats();
  const tagC = (t) => t === "bull" ? G : t === "bear" ? R : Y;
  const tagBg = (t) => t === "bull" ? "rgba(0,229,160,.1)" : t === "bear" ? "rgba(255,68,102,.1)" : "rgba(245,200,66,.1)";
  const hasKey = apiKeys.finnhub || apiKeys.polygon || apiKeys.twelvedata;

  const Inp = (props) => <input {...props} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${BOR}`, background: S1, color: "#c8d8e8", fontFamily: "monospace", fontSize: 11, marginBottom: 7, ...props.style }} />;
  const Sel = (props) => <select {...props} style={{ width: "100%", padding: "7px 10px", borderRadius: 7, border: `1px solid ${BOR}`, background: S1, color: "#c8d8e8", fontFamily: "monospace", fontSize: 11, marginBottom: 7, ...props.style }} />;
  const Btn = ({ onClick, children, primary, style: sx }) => <button onClick={onClick} style={{ flex: 1, padding: "8px", borderRadius: 7, border: primary ? `1px solid ${G}` : `1px solid ${BOR}`, background: primary ? G : "transparent", color: primary ? "#000" : "#556677", fontSize: 11, cursor: "pointer", fontFamily: "monospace", fontWeight: primary ? 700 : 400, ...sx }}>{children}</button>;

  const macroDisplay = [
    { label: "VIX", sym: "^VIX", color: Y },
    { label: "10Y Yield", sym: "^TNX", color: R },
    { label: "DXY Dollar", sym: "DX-Y.NYB", color: Y },
    { label: "Gold", sym: "GC=F", color: Y },
    { label: "WTI Oil", sym: "CL=F", color: "#8899aa" },
    { label: "Bitcoin", sym: "BTC-USD", color: G },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "195px 1fr 252px", gridTemplateRows: "52px 1fr", height: "100vh", background: BG, color: "#c8d8e8", fontFamily: "system-ui,sans-serif", fontSize: 13, overflow: "hidden" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800&display=swap');
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.08}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(7px)}to{opacity:1;transform:translateY(0)}}
        @keyframes tdot{0%,80%,100%{transform:scale(.35);opacity:.15}40%{transform:scale(1);opacity:1}}
        @keyframes glowPulse{0%,100%{box-shadow:0 0 16px rgba(0,229,160,.2)}50%{box-shadow:0 0 36px rgba(0,229,160,.55)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
        @keyframes scanPulse{0%,100%{opacity:.4}50%{opacity:1}}
        *{box-sizing:border-box}
        ::-webkit-scrollbar{width:3px}::-webkit-scrollbar-thumb{background:#162030;border-radius:3px}
        .hov:hover{background:#0c1824!important}
        .hovg:hover{border-color:${G}!important;color:${G}!important}
        .cc:hover{border-color:rgba(0,229,160,.22)!important;transform:translateY(-1px)}
        textarea:focus,input:focus,select:focus{outline:none;border-color:rgba(0,229,160,.45)!important;box-shadow:0 0 0 2px rgba(0,229,160,.07)!important}
        .pbtn:hover:not(:disabled){opacity:.88;transform:translateY(-1px)}
        .pfbtn{animation:glowPulse 2.5s ease-in-out infinite}
        .pfbtn:hover{transform:scale(1.02)!important;animation:none!important}
      `}</style>

      {showSettings && <APISettings keys={apiKeys} onSave={saveKeys} onClose={() => setShowSettings(false)} />}

      {/* TOASTS */}
      <div style={{ position: "fixed", bottom: 14, right: 14, zIndex: 9999, maxWidth: 300 }}>
        {toasts.map(t => (
          <div key={t.id} style={{ background: "#080f18", border: `1px solid #1e3040`, borderLeft: `3px solid ${t.type === "bull" || t.type === "info" ? G : t.type === "warn" ? Y : R}`, borderRadius: 10, padding: "10px 13px", marginBottom: 6, display: "flex", gap: 9, animation: "fadeUp .3s ease", boxShadow: "0 10px 32px rgba(0,0,0,.8)" }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>{t.type === "bull" ? "📈" : t.type === "bear" ? "⚡" : "✦"}</span>
            <div><div style={{ fontWeight: 600, color: "#fff", fontSize: 12, marginBottom: 1 }}>{t.title}</div><div style={{ color: "#3a5060", fontFamily: "monospace", fontSize: 9, lineHeight: 1.5 }}>{t.msg}</div></div>
          </div>
        ))}
      </div>

      {/* HEADER */}
      <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 18px", borderBottom: `1px solid ${BOR}`, background: "rgba(4,8,16,.99)", zIndex: 10, position: "relative" }}>
        <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 1, background: `linear-gradient(90deg,transparent 5%,${G}44,${B}44,transparent 95%)` }} />
        <div style={{ display: "flex", alignItems: "center", gap: 11 }}>
          <div style={{ width: 32, height: 32, background: `linear-gradient(135deg,${G},${B})`, clipPath: "polygon(50% 0%,100% 25%,100% 75%,50% 100%,0% 75%,0% 25%)", flexShrink: 0 }} />
          <div>
            <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 19, letterSpacing: 5, color: "#fff", lineHeight: 1 }}>APEX</div>
            <div style={{ fontFamily: "monospace", fontSize: 7, color: G, letterSpacing: 3, opacity: .7 }}>ELITE MARKET INTELLIGENCE v6</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 14, overflow: "hidden", flex: 1, margin: "0 14px" }}>
          {watchlist.slice(0, 5).map(w => {
            const p = prices[w.sym];
            return (
              <span key={w.sym} style={{ display: "flex", gap: 5, whiteSpace: "nowrap", fontFamily: "monospace", fontSize: 10, flexShrink: 0 }}>
                <span style={{ color: "#fff", fontWeight: 700 }}>{w.sym}</span>
                {p ? <span style={{ color: p.chg >= 0 ? G : R }}>{p.chg >= 0 ? "▲" : "▼"}{Math.abs(p.chg).toFixed(2)}%</span>
                  : <span style={{ color: hasKey ? "#2a4050" : "#1a2030", animation: hasKey ? "scanPulse 1.5s infinite" : "none" }}>{hasKey ? "..." : "—"}</span>}
              </span>
            );
          })}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {dataLoading && <span style={{ fontSize: 12, display: "inline-block", animation: "spin 1s linear infinite", color: G }}>⟳</span>}
          {lastUpdated && <span style={{ fontFamily: "monospace", fontSize: 9, color: "#2a4050" }}>{lastUpdated.toLocaleTimeString()}</span>}
          {scanning && <span style={{ fontFamily: "monospace", fontSize: 9, color: Y, animation: "scanPulse 1s infinite" }}>⬡ SCANNING</span>}
          <button onClick={() => setShowSettings(true)} style={{ background: "transparent", border: `1px solid ${BOR}`, borderRadius: 6, color: hasKey ? G : Y, fontSize: 10, cursor: "pointer", padding: "3px 9px", fontFamily: "monospace" }} title="API Keys">
            {hasKey ? "⚙ Keys" : "⚙ Setup"}
          </button>
          <div style={{ position: "relative", cursor: "pointer" }} onClick={() => { setView("signals"); markAllRead(); }}>
            <div style={{ width: 5, height: 5, borderRadius: "50%", background: G, animation: "blink 1.2s infinite" }} />
            {notifCount > 0 && <div style={{ position: "absolute", top: -8, left: 3, background: R, color: "#fff", fontSize: 8, fontFamily: "monospace", padding: "1px 4px", borderRadius: 8, minWidth: 16, textAlign: "center" }}>{notifCount}</div>}
          </div>
        </div>
      </div>

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
          {[{ id: "chat", icon: "◎", label: "Intelligence" }, { id: "signals", icon: "⬡", label: "Live Signals" }, { id: "portfolio", icon: "◈", label: "Portfolio" }, { id: "journal", icon: "◉", label: "Journal" }, { id: "risk", icon: "◇", label: "Risk Calc" }].map(n => (
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

      {/* MAIN */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: BG }}>
        <div style={{ display: "flex", gap: 2, padding: "7px 14px 0", borderBottom: `1px solid ${BOR}`, background: S1 }}>
          {[{ id: "chat", l: "💬 Chat" }, { id: "signals", l: "⬡ Signals" }, { id: "portfolio", l: "◈ Portfolio" }, { id: "journal", l: "◉ Journal" }, { id: "risk", l: "◇ Risk" }].map(t => (
            <div key={t.id} onClick={() => { setView(t.id); if (t.id === "signals") markAllRead(); }}
              style={{ padding: "6px 12px", borderRadius: "6px 6px 0 0", fontSize: 11, fontWeight: 500, cursor: "pointer", color: view === t.id ? G : "#2a4050", background: view === t.id ? BG : "transparent", border: view === t.id ? `1px solid ${BOR}` : "1px solid transparent", borderBottom: view === t.id ? `1px solid ${BG}` : "1px solid transparent", marginBottom: -1, transition: ".15s", whiteSpace: "nowrap" }}>
              {t.l}
            </div>
          ))}
        </div>

        {/* CHAT */}
        {view === "chat" && <>
          <div style={{ flex: 1, overflowY: "auto", padding: "18px 20px" }}>
            {messages.length === 0 && (
              <div style={{ background: "linear-gradient(160deg,rgba(0,229,160,.05),rgba(0,170,255,.03))", border: `1px solid rgba(0,229,160,.12)`, borderRadius: 16, padding: "20px 22px", marginBottom: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 20, right: 20, height: 1, background: `linear-gradient(90deg,transparent,${G},transparent)` }} />
                <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 800, fontSize: 22, letterSpacing: 2, color: "#fff", marginBottom: 4 }}>APEX <span style={{ color: G }}>v6</span></div>
                <div style={{ fontSize: 12, color: "#3a5060", lineHeight: 1.75, marginBottom: 14, maxWidth: 500 }}>
                  {!hasKey ? <span style={{ color: Y }}>⚡ Add your Finnhub API key to enable live prices. Click <strong style={{ color: Y, cursor: "pointer" }} onClick={() => setShowSettings(true)}>⚙ Setup</strong> in the top right.</span>
                    : <span>Powered by <strong style={{ color: G }}>Finnhub live data</strong> — prices refresh every 60 seconds. AI analysis uses real current market conditions.</span>}
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
                    {setup ? <div><p style={{ fontSize: 12, color: "#6677aa", marginBottom: 6 }}>Live data analyzed — {setup.prob} probability setup identified:</p><SetupCard s={setup} /></div> : <div dangerouslySetInnerHTML={{ __html: mdRender(m.text) }} />}
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
      </div>

      {/* RIGHT SIDEBAR */}
      <div style={{ background: S1, borderLeft: `1px solid ${BOR}`, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: `1px solid ${BOR}` }}>
          {[{ id: "news", l: "NEWS" }, { id: "alerts", l: "ALERTS" }, { id: "macro", l: "MACRO" }].map(t => (
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
          </div>
        )}
      </div>
    </div>
  );
}
