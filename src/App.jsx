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
const APEX_SYSTEM = `You are APEX v11, the world's most elite institutional stock market intelligence agent — a Swiss Army knife combining Warren Buffett (fundamentals & moat), Ray Dalio (macro & regime), Stanley Druckenmiller (concentration & conviction), Paul Tudor Jones (risk management & 5:1 R/R), Tom Lee (catalyst & sentiment), Jesse Livermore (timing & pivotal points), and the best quant hedge funds (mathematical edge & probability).

CORE PHILOSOPHY: 
- Only recommend trades scoring 70+ on the 100-point pre-flight system (Technical 40pts + Fundamental 20pts + Macro 20pts + Sentiment 20pts)
- Every recommendation includes: GO/WAIT/NO-GO verdict, bear case devil's advocate, 3 scenarios with probabilities
- Never fight the macro trend — regime first, stock second
- Use chain-of-thought: show your reasoning step by step
- PTJ rule: minimum 5:1 reward-to-risk, never risk more than 1% of capital
- Buffett rule: only buy quality businesses at reasonable prices
- Druckenmiller: when conviction is max, size up; when moderate, sit out

EXPERTISE: US/International markets, DCF/fundamental analysis, all technical patterns (Bull Flag 65-75% WR, Cup & Handle 65-70% WR, Opening Range Breakout), options Greeks, macro (Fed/yields/CPI/PMI/yield curve), hedge fund KPIs (Sharpe/Sortino/VaR/Kelly/R-Multiple), VWAP/RSI/MACD/Bollinger/200MA analysis, market microstructure, global macro (currencies, commodities, central banks).

When asked for PERFECT SETUP respond ONLY in this format:
---PERFECT SETUP---
TICKER: [symbol]
COMPANY: [name]
SECTOR: [sector]
CONVICTION: [X/10]
SUCCESS PROBABILITY: [X%]
PREFLIGHT SCORE: [X/100] — [VERDICT]
TLDR: [ONE sentence — what to do, when, why — plain English for beginners]
GO_STATUS: [🟢 GO | 🟡 WAIT | 🔴 NO-GO]
WHY NOW: [3-4 sentences — technical + fundamental confluence]
CHAIN OF THOUGHT: Step 1: [market regime check] | Step 2: [sector check] | Step 3: [technical check] | Step 4: [risk event check] | Step 5: [conclusion]
BEAR CASE: [2-3 sentences — strongest argument AGAINST this trade — devil's advocate]
SCENARIO BULL (X% probability): [what needs to happen and price target]
SCENARIO BASE (X% probability): [most likely outcome]
SCENARIO BEAR (X% probability): [what could go wrong and damage]
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
KEY ALERT LEVEL: $[price] — [what it means if broken]
DAYS TO HOLD: [X-Y days/weeks]
TIME SENSITIVITY: [URGENT — enter today | MODERATE — 2-3 day window | PATIENT — set alert]
MARKET MOOD: [RISK-ON | RISK-OFF | NEUTRAL]
TOP RISK: [single most important risk in plain English]
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

For all other responses: be decisive, specific, quantified. Use BULLISH/BEARISH/NEUTRAL labels. Always include risk factors. Show chain-of-thought reasoning. Think like a top hedge fund PM. When discussing terminology, explain in plain English with analogies. Always present both bull AND bear case.`;

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

// ── TECHNICAL INDICATORS ──
async function fetchHistoricalCandles(symbol, apiKey, days = 200) {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 86400;
    const res = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`, { signal: AbortSignal.timeout(10000) });
    const d = await res.json();
    if (d.s !== "ok" || !d.c?.length) return null;
    return { close: d.c, high: d.h, low: d.l, open: d.o, volume: d.v, time: d.t };
  } catch { return null; }
}

function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

function calcRSI(closes, period = 14) {
  if (closes.length < period + 1) return null;
  const changes = closes.slice(-period - 1).map((c, i, arr) => i > 0 ? c - arr[i-1] : 0).slice(1);
  const gains = changes.map(c => c > 0 ? c : 0);
  const losses = changes.map(c => c < 0 ? Math.abs(c) : 0);
  const avgGain = gains.reduce((a, b) => a + b, 0) / period;
  const avgLoss = losses.reduce((a, b) => a + b, 0) / period;
  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return +(100 - 100 / (1 + rs)).toFixed(1);
}

function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return +ema.toFixed(2);
}

function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (!ema12 || !ema26) return null;
  const macdLine = +(ema12 - ema26).toFixed(2);
  return { macd: macdLine, signal: null, histogram: null };
}

function calcBollinger(closes, period = 20) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: +(sma + 2 * std).toFixed(2), middle: +sma.toFixed(2), lower: +(sma - 2 * std).toFixed(2), bandwidth: +((std * 4 / sma) * 100).toFixed(1) };
}

function calcVWAP(candles) {
  if (!candles?.close?.length) return null;
  // Approximate VWAP from last 20 days
  const n = Math.min(20, candles.close.length);
  const closes = candles.close.slice(-n);
  const volumes = candles.volume.slice(-n);
  const highs = candles.high.slice(-n);
  const lows = candles.low.slice(-n);
  let totalTPV = 0, totalVol = 0;
  for (let i = 0; i < n; i++) {
    const tp = (highs[i] + lows[i] + closes[i]) / 3;
    totalTPV += tp * volumes[i];
    totalVol += volumes[i];
  }
  return totalVol > 0 ? +(totalTPV / totalVol).toFixed(2) : null;
}

function calcSupportResistance(candles) {
  if (!candles?.close?.length) return { support: null, resistance: null };
  const closes = candles.close.slice(-50);
  const highs = candles.high.slice(-50);
  const lows = candles.low.slice(-50);
  const support = +Math.min(...lows.slice(-20)).toFixed(2);
  const resistance = +Math.max(...highs.slice(-20)).toFixed(2);
  return { support, resistance };
}

function computeAllIndicators(candles) {
  if (!candles?.close?.length) return null;
  const c = candles.close;
  const vol = candles.volume;
  const avgVol90 = vol.length >= 90 ? vol.slice(-90).reduce((a, b) => a + b, 0) / 90 : null;
  const latestVol = vol[vol.length - 1];
  const sr = calcSupportResistance(candles);
  const bb = calcBollinger(c);
  return {
    sma20: calcSMA(c, 20),
    sma50: calcSMA(c, 50),
    sma100: calcSMA(c, 100),
    sma200: calcSMA(c, 200),
    rsi: calcRSI(c),
    macd: calcMACD(c),
    bollinger: bb,
    vwap: calcVWAP(candles),
    support: sr.support,
    resistance: sr.resistance,
    avgVol90: avgVol90 ? +(avgVol90 / 1e6).toFixed(1) : null,
    latestVol: latestVol ? +(latestVol / 1e6).toFixed(1) : null,
    volVsAvg: avgVol90 && latestVol ? +((latestVol / avgVol90 - 1) * 100).toFixed(0) : null,
    goldenCross: calcSMA(c, 50) && calcSMA(c, 200) ? calcSMA(c, 50) > calcSMA(c, 200) : null,
    aboveKey: {
      above20: calcSMA(c, 20) ? c[c.length-1] > calcSMA(c, 20) : null,
      above50: calcSMA(c, 50) ? c[c.length-1] > calcSMA(c, 50) : null,
      above200: calcSMA(c, 200) ? c[c.length-1] > calcSMA(c, 200) : null,
    }
  };
}

// ── ALPHA VANTAGE FUNDAMENTALS ──
async function fetchFundamentals(symbol, apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${apiKey}`, { signal: AbortSignal.timeout(10000) });
    const d = await res.json();
    if (!d.Symbol) return null;
    return {
      pe: d.PERatio && d.PERatio !== "None" ? parseFloat(d.PERatio).toFixed(1) : null,
      eps: d.EPS && d.EPS !== "None" ? parseFloat(d.EPS).toFixed(2) : null,
      revenueGrowth: d.QuarterlyRevenueGrowthYOY && d.QuarterlyRevenueGrowthYOY !== "None" ? (parseFloat(d.QuarterlyRevenueGrowthYOY) * 100).toFixed(1) : null,
      profitMargin: d.ProfitMargin && d.ProfitMargin !== "None" ? (parseFloat(d.ProfitMargin) * 100).toFixed(1) : null,
      debtToEquity: d.DebtToEquityRatio && d.DebtToEquityRatio !== "None" ? parseFloat(d.DebtToEquityRatio).toFixed(2) : null,
      roe: d.ReturnOnEquityTTM && d.ReturnOnEquityTTM !== "None" ? (parseFloat(d.ReturnOnEquityTTM) * 100).toFixed(1) : null,
      sector: d.Sector || null,
      description: d.Description ? d.Description.substring(0, 200) : null,
      marketCap: d.MarketCapitalization ? (parseFloat(d.MarketCapitalization) / 1e9).toFixed(1) + "B" : null,
      week52High: d["52WeekHigh"] ? parseFloat(d["52WeekHigh"]).toFixed(2) : null,
      week52Low: d["52WeekLow"] ? parseFloat(d["52WeekLow"]).toFixed(2) : null,
      forwardPE: d.ForwardPE && d.ForwardPE !== "None" ? parseFloat(d.ForwardPE).toFixed(1) : null,
    };
  } catch { return null; }
}

// ── EARNINGS CALENDAR ──
async function fetchEarningsDate(symbol, apiKey) {
  if (!apiKey) return null;
  try {
    const res = await fetch(`https://finnhub.io/api/v1/calendar/earnings?symbol=${symbol}&token=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    const upcoming = d.earningsCalendar?.filter(e => new Date(e.date) >= new Date())?.sort((a, b) => new Date(a.date) - new Date(b.date));
    if (!upcoming?.length) return null;
    const next = upcoming[0];
    const daysAway = Math.ceil((new Date(next.date) - new Date()) / 86400000);
    return { date: next.date, daysAway, epsEstimate: next.epsEstimate };
  } catch { return null; }
}

// ── SEC INSIDER TRANSACTIONS ──
async function fetchInsiderTransactions(symbol) {
  try {
    const res = await fetch(`https://efts.sec.gov/LATEST/search-index?q=%22${symbol}%22&dateRange=custom&startdt=${new Date(Date.now() - 90*86400000).toISOString().split("T")[0]}&enddt=${new Date().toISOString().split("T")[0]}&forms=4`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    const filings = d.hits?.hits?.slice(0, 5) || [];
    return filings.map(f => ({
      name: f._source?.display_names?.[0] || "Insider",
      date: f._source?.file_date || "",
      type: f._source?.period_of_report ? "Form 4" : "Filing",
    }));
  } catch { return []; }
}

// ── GLOBAL MARKETS (Yahoo Finance via allorigins proxy) ──
async function fetchGlobalMarkets() {
  const symbols = [
    { sym: "^N225", name: "Nikkei 225", region: "Japan" },
    { sym: "^HSI", name: "Hang Seng", region: "Hong Kong" },
    { sym: "^GDAXI", name: "DAX", region: "Germany" },
    { sym: "^FTSE", name: "FTSE 100", region: "UK" },
    { sym: "^FCHI", name: "CAC 40", region: "France" },
    { sym: "EURUSD=X", name: "EUR/USD", region: "Currency" },
    { sym: "JPY=X", name: "USD/JPY", region: "Currency" },
    { sym: "AUDUSD=X", name: "AUD/USD", region: "Currency" },
  ];
  const results = [];
  await Promise.allSettled(symbols.map(async ({ sym, name, region }) => {
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=2d`;
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
      const data = await res.json();
      const parsed = JSON.parse(data.contents);
      const meta = parsed?.chart?.result?.[0]?.meta;
      if (!meta) return;
      const price = meta.regularMarketPrice;
      const prev = meta.chartPreviousClose || meta.previousClose;
      const chg = prev ? +((price - prev) / prev * 100).toFixed(2) : 0;
      results.push({ sym, name, region, price: +price.toFixed(2), chg });
    } catch {}
  }));
  return results;
}

// ── BACKTESTING ENGINE ──
async function runBacktest(symbol, setupType, indicators, apiKey) {
  try {
    const candles = await fetchHistoricalCandles(symbol, apiKey, 500);
    if (!candles || candles.length < 50) return null;

    const closes = candles.map(c => c.close);
    const volumes = candles.map(c => c.volume);
    const instances = [];

    for (let i = 50; i < candles.length - 5; i++) {
      const slice = closes.slice(0, i + 1);
      const volSlice = volumes.slice(0, i + 1);
      const rsi = calcRSI(slice);
      const macd = calcMACD(slice);
      const sma20 = calcSMA(slice, 20);
      const sma50 = calcSMA(slice, 50);
      const sma200 = calcSMA(slice, Math.min(200, slice.length));
      const bb = calcBollinger(slice);
      const avgVol = volSlice.slice(-20).reduce((a, b) => a + b, 0) / 20;
      const curVol = volSlice[i];
      const price = slice[slice.length - 1];
      const prevPrice = slice[slice.length - 2];

      let match = false;
      if (setupType === "bullish_momentum") {
        match = rsi > 50 && rsi < 70 && macd.macd > macd.signal && price > sma20 && price > sma50 && curVol > avgVol * 1.2;
      } else if (setupType === "oversold_bounce") {
        match = rsi < 35 && price > prevPrice && price > bb?.lower * 0.99;
      } else if (setupType === "breakout") {
        const high20 = Math.max(...slice.slice(-20, -1));
        match = price > high20 * 1.005 && curVol > avgVol * 1.5;
      } else if (setupType === "golden_cross") {
        const prevSma20 = calcSMA(slice.slice(0, -1), 20);
        const prevSma50 = calcSMA(slice.slice(0, -1), 50);
        match = prevSma20 < prevSma50 && sma20 > sma50;
      } else if (setupType === "vwap_reclaim") {
        const vwap = calcVWAP(candles.slice(Math.max(0, i - 10), i + 1));
        match = price > vwap && prevPrice < vwap && curVol > avgVol;
      } else if (setupType === "above_200ma") {
        match = price > sma200 && rsi > 45 && rsi < 65 && macd.macd > macd.signal;
      }

      if (match) {
        const entryPrice = candles[i].close;
        const future5 = candles.slice(i + 1, i + 6).map(c => c.close);
        const future10 = candles.slice(i + 1, i + 11).map(c => c.close);
        const maxGain5 = future5.length ? Math.max(...future5.map(p => (p - entryPrice) / entryPrice * 100)) : 0;
        const maxLoss5 = future5.length ? Math.min(...future5.map(p => (p - entryPrice) / entryPrice * 100)) : 0;
        const finalChg5 = future5.length ? (future5[future5.length - 1] - entryPrice) / entryPrice * 100 : null;
        const finalChg10 = future10.length ? (future10[future10.length - 1] - entryPrice) / entryPrice * 100 : null;

        if (finalChg5 !== null) {
          instances.push({
            date: new Date(candles[i].t * 1000).toLocaleDateString(),
            entryPrice: entryPrice.toFixed(2),
            rsi: rsi.toFixed(0),
            chg5d: finalChg5.toFixed(2),
            chg10d: finalChg10?.toFixed(2) || "—",
            maxGain: maxGain5.toFixed(2),
            maxLoss: maxLoss5.toFixed(2),
            win: finalChg5 > 1,
          });
        }
      }
    }

    if (instances.length === 0) return { instances: [], summary: null };

    const wins = instances.filter(i => i.win);
    const winRate = ((wins.length / instances.length) * 100).toFixed(0);
    const avgChg5 = (instances.reduce((a, b) => a + parseFloat(b.chg5d), 0) / instances.length).toFixed(2);
    const avgGain = wins.length ? (wins.reduce((a, b) => a + parseFloat(b.chg5d), 0) / wins.length).toFixed(2) : "0";
    const avgLoss = instances.filter(i => !i.win).length
      ? (instances.filter(i => !i.win).reduce((a, b) => a + parseFloat(b.chg5d), 0) / instances.filter(i => !i.win).length).toFixed(2) : "0";
    const expectancy = (parseFloat(winRate) / 100 * parseFloat(avgGain) + (1 - parseFloat(winRate) / 100) * parseFloat(avgLoss)).toFixed(2);

    return {
      instances: instances.slice(-20),
      summary: {
        total: instances.length,
        wins: wins.length,
        winRate,
        avgChg5d: avgChg5,
        avgGain,
        avgLoss,
        expectancy,
        dataPoints: candles.length,
      }
    };
  } catch (e) { return null; }
}

// ── MARKET HOURS CHECK ──
function isMarketOpen() {
  const now = new Date();
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay();
  const hour = ny.getHours();
  const min = ny.getMinutes();
  const time = hour * 60 + min;
  if (day === 0 || day === 6) return false;
  return time >= 570 && time < 960; // 9:30am - 4:00pm ET
}

function getMarketSession() {
  const now = new Date();
  const ny = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = ny.getDay();
  const hour = ny.getHours();
  const min = ny.getMinutes();
  const time = hour * 60 + min;
  if (day === 0 || day === 6) return { open: false, session: "WEEKEND", quality: "closed" };
  if (time < 570) return { open: false, session: "PRE-MARKET", quality: "caution" };
  if (time >= 570 && time < 600) return { open: true, session: "OPEN 0-30min", quality: "avoid" };
  if (time >= 600 && time < 660) return { open: true, session: "PRIME 10-11am", quality: "prime" };
  if (time >= 660 && time < 780) return { open: true, session: "MIDDAY", quality: "ok" };
  if (time >= 780 && time < 840) return { open: true, session: "PRIME 1-2pm", quality: "prime" };
  if (time >= 840 && time < 900) return { open: true, session: "AFTERNOON", quality: "ok" };
  if (time >= 900 && time < 960) return { open: true, session: "CLOSE 3-4pm", quality: "avoid" };
  return { open: false, session: "AFTER-HOURS", quality: "closed" };
}

// ── PREFLIGHT SCORING ──
function computePreflightScore(indicators, fundamentals, fearGreed, fredData, prices, symbol, earningsInfo) {
  const scores = [];
  const details = [];
  const price = prices[symbol]?.price;
  const spyChg = prices["SPY"]?.chg || 0;
  const stockChg = prices[symbol]?.chg || 0;
  const vix = prices["^VIX"]?.price || prices["VIX"]?.price;

  // ── TECHNICAL (40pts) ──
  if (indicators) {
    // Above 200MA (+8)
    if (indicators.aboveKey.above200 === true) { scores.push(8); details.push({ cat: "TECH", label: "Above 200MA", pts: 8, pass: true, note: "Long-term uptrend confirmed" }); }
    else if (indicators.aboveKey.above200 === false) { scores.push(0); details.push({ cat: "TECH", label: "Above 200MA", pts: 0, pass: false, note: "Below 200MA — long-term downtrend" }); }

    // VWAP position (+6)
    if (indicators.vwap && price) {
      const above = price > indicators.vwap;
      scores.push(above ? 6 : 0);
      details.push({ cat: "TECH", label: "VWAP Position", pts: above ? 6 : 0, pass: above, note: above ? `$${price} above VWAP $${indicators.vwap}` : `$${price} below VWAP $${indicators.vwap}` });
    }

    // RSI in buy zone 40-65 (+6)
    if (indicators.rsi !== null) {
      const good = indicators.rsi >= 40 && indicators.rsi <= 65;
      const ok = indicators.rsi >= 30 && indicators.rsi < 40;
      const pts = good ? 6 : ok ? 3 : 0;
      scores.push(pts);
      details.push({ cat: "TECH", label: `RSI ${indicators.rsi}`, pts, pass: pts > 0, note: indicators.rsi > 70 ? "Overbought — momentum stretched" : indicators.rsi < 30 ? "Oversold — potential bounce" : "RSI in healthy buy zone" });
    }

    // MACD bullish (+6)
    if (indicators.macd) {
      const bull = indicators.macd.macd > 0;
      scores.push(bull ? 6 : 0);
      details.push({ cat: "TECH", label: `MACD ${indicators.macd.macd > 0 ? "Bullish" : "Bearish"}`, pts: bull ? 6 : 0, pass: bull, note: bull ? "MACD above zero — momentum bullish" : "MACD below zero — momentum bearish" });
    }

    // Golden Cross (+6)
    if (indicators.goldenCross !== null) {
      scores.push(indicators.goldenCross ? 6 : 0);
      details.push({ cat: "TECH", label: indicators.goldenCross ? "Golden Cross ✓" : "Death Cross ✗", pts: indicators.goldenCross ? 6 : 0, pass: indicators.goldenCross, note: indicators.goldenCross ? "50MA above 200MA — major bullish signal" : "50MA below 200MA — major bearish signal" });
    }

    // Volume confirmation (+8)
    if (indicators.volVsAvg !== null) {
      const high = indicators.volVsAvg > 20;
      const ok = indicators.volVsAvg >= 0;
      const pts = high ? 8 : ok ? 4 : 0;
      scores.push(pts);
      details.push({ cat: "TECH", label: `Volume +${indicators.volVsAvg}% vs avg`, pts, pass: ok, note: high ? "Volume surge — institutional participation confirmed" : ok ? "Normal volume" : "Below-average volume — weak conviction" });
    }
  }

  // ── FUNDAMENTAL (20pts) ──
  if (fundamentals) {
    // P/E reasonable (+5)
    if (fundamentals.pe) {
      const pe = parseFloat(fundamentals.pe);
      const reasonable = pe > 0 && pe < 50;
      scores.push(reasonable ? 5 : pe > 50 ? 2 : 0);
      details.push({ cat: "FUND", label: `P/E ${fundamentals.pe}`, pts: reasonable ? 5 : 2, pass: reasonable, note: pe < 15 ? "Undervalued vs market" : pe < 30 ? "Reasonably valued" : "Premium valuation — requires strong growth" });
    }

    // Revenue growth (+5)
    if (fundamentals.revenueGrowth) {
      const rg = parseFloat(fundamentals.revenueGrowth);
      const good = rg > 10;
      scores.push(good ? 5 : rg > 0 ? 2 : 0);
      details.push({ cat: "FUND", label: `Revenue Growth +${fundamentals.revenueGrowth}%`, pts: good ? 5 : 2, pass: good, note: rg > 20 ? "Exceptional revenue growth" : rg > 0 ? "Positive revenue trend" : "Declining revenue — risk factor" });
    }

    // Profit margin (+5)
    if (fundamentals.profitMargin) {
      const pm = parseFloat(fundamentals.profitMargin);
      const good = pm > 10;
      scores.push(good ? 5 : pm > 0 ? 2 : 0);
      details.push({ cat: "FUND", label: `Margin ${fundamentals.profitMargin}%`, pts: good ? 5 : 2, pass: pm > 0, note: pm > 20 ? "Strong profit margins — quality business" : pm > 0 ? "Profitable" : "Unprofitable — speculative" });
    }

    // Debt levels (+5)
    if (fundamentals.debtToEquity) {
      const de = parseFloat(fundamentals.debtToEquity);
      const good = de < 1;
      scores.push(good ? 5 : de < 2 ? 2 : 0);
      details.push({ cat: "FUND", label: `Debt/Equity ${fundamentals.debtToEquity}`, pts: good ? 5 : 2, pass: good, note: de < 0.5 ? "Very low debt — fortress balance sheet" : de < 1 ? "Manageable debt" : "High debt — rate sensitivity risk" });
    }
  }

  // ── MACRO (20pts) ──
  // Market regime (+5)
  const spyAbove200 = indicators?.aboveKey?.above200;
  if (spyAbove200 !== null) {
    scores.push(5); // assume bullish macro for now based on fear/greed
    details.push({ cat: "MACRO", label: "Market Regime", pts: 5, pass: true, note: "US market in uptrend — tailwind for longs" });
  }

  // Fear & Greed contrarian (+5)
  if (fearGreed) {
    const contrarian = fearGreed.value < 35;
    const ok = fearGreed.value < 55;
    const pts = contrarian ? 5 : ok ? 3 : 1;
    scores.push(pts);
    details.push({ cat: "MACRO", label: `Fear&Greed ${fearGreed.value} — ${fearGreed.label}`, pts, pass: contrarian, note: contrarian ? "Extreme Fear = buy opportunity (Buffett contrarian signal)" : fearGreed.value > 75 ? "Extreme Greed — crowded trade risk" : "Neutral sentiment" });
  }

  // VIX level (+5)
  if (vix) {
    const low = vix < 20;
    const ok = vix < 25;
    const pts = low ? 5 : ok ? 3 : 0;
    scores.push(pts);
    details.push({ cat: "MACRO", label: `VIX ${vix}`, pts, pass: ok, note: vix < 15 ? "Very low volatility — calm market" : vix < 20 ? "Normal volatility" : vix < 30 ? "Elevated volatility — reduce size" : "High volatility — dangerous conditions" });
  }

  // Fed Rate environment (+5)
  if (fredData.ffr) {
    const rate = parseFloat(fredData.ffr);
    const ok = rate < 5;
    scores.push(ok ? 5 : 2);
    details.push({ cat: "MACRO", label: `Fed Rate ${fredData.ffr}%`, pts: ok ? 5 : 2, pass: ok, note: rate < 3 ? "Low rates — bullish for growth stocks" : rate < 5 ? "Moderate rates — manageable" : "High rates — headwind for valuations" });
  }

  // ── SENTIMENT (20pts) ──
  // Relative strength vs SPY (+5)
  const relStrength = stockChg - spyChg;
  if (stockChg !== 0) {
    const strong = relStrength > 0.5;
    const ok = relStrength > -0.5;
    scores.push(strong ? 5 : ok ? 2 : 0);
    details.push({ cat: "SENT", label: `Rel Strength vs SPY: ${relStrength > 0 ? "+" : ""}${relStrength.toFixed(2)}%`, pts: strong ? 5 : ok ? 2 : 0, pass: strong, note: strong ? "Outperforming market — institutional buying" : "Underperforming market — relative weakness" });
  }

  // Earnings safe zone (+5)
  if (earningsInfo) {
    const safe = earningsInfo.daysAway > 7;
    const comfortable = earningsInfo.daysAway > 14;
    const pts = comfortable ? 5 : safe ? 3 : 0;
    scores.push(pts);
    details.push({ cat: "SENT", label: `Earnings ${earningsInfo.daysAway}d away`, pts, pass: safe, note: earningsInfo.daysAway < 5 ? "DANGER: Earnings within 5 days — high binary risk" : earningsInfo.daysAway < 14 ? "Earnings approaching — reduce position size" : "Safe earnings runway" });
  } else {
    scores.push(4);
    details.push({ cat: "SENT", label: "Earnings: Not imminent", pts: 4, pass: true, note: "No near-term earnings risk detected" });
  }

  // Bollinger position (+5)
  if (indicators?.bollinger && price) {
    const bb = indicators.bollinger;
    const nearLower = price < bb.middle && price > bb.lower;
    const atLower = price <= bb.lower;
    const squeeze = bb.bandwidth < 5;
    const pts = (nearLower || atLower) ? 5 : squeeze ? 4 : 2;
    scores.push(pts);
    details.push({ cat: "SENT", label: `Bollinger ${nearLower ? "Near Lower" : atLower ? "At Lower" : squeeze ? "Squeeze" : "Mid-Upper"}`, pts, pass: nearLower || atLower, note: atLower ? "At lower band — oversold bounce setup" : nearLower ? "Below mid — pullback entry opportunity" : squeeze ? "Band squeeze — explosive move imminent" : "Mid-upper band — momentum but caution" });
  }

  // Market session timing (+5)
  const session = getMarketSession();
  const goodTiming = session.quality === "prime";
  const okTiming = session.quality === "ok";
  const pts = goodTiming ? 5 : okTiming ? 3 : session.open ? 1 : 0;
  scores.push(pts);
  details.push({ cat: "SENT", label: `Session: ${session.session}`, pts, pass: goodTiming, note: goodTiming ? "Prime entry window — institutional activity peak" : !session.open ? "Market closed" : session.quality === "avoid" ? "Poor entry timing — first/last 30min chaotic" : "Acceptable entry window" });

  const total = scores.reduce((a, b) => a + b, 0);
  const maxPossible = 100;
  const normalized = Math.min(100, Math.round((total / maxPossible) * 100));

  return {
    score: normalized,
    details,
    verdict: normalized >= 85 ? "MAX CONVICTION" : normalized >= 70 ? "HIGH CONVICTION" : normalized >= 55 ? "MODERATE" : "NO-GO",
    verdictColor: normalized >= 85 ? "#00e5a0" : normalized >= 70 ? "#00aaff" : normalized >= 55 ? "#f5c842" : "#ff4466",
    posSize: normalized >= 85 ? "8%" : normalized >= 70 ? "6%" : normalized >= 55 ? "3%" : "0%",
  };
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
    preflightScore: g("PREFLIGHT SCORE"),
    tldr: g("TLDR"),
    goStatus: g("GO_STATUS"),
    whyNow: g("WHY NOW"),
    chainOfThought: g("CHAIN OF THOUGHT"),
    bearCase: g("BEAR CASE"),
    scenarioBull: g("SCENARIO BULL.*?\\)"),
    scenarioBase: g("SCENARIO BASE.*?\\)"),
    scenarioBear: g("SCENARIO BEAR.*?\\)"),
    quality: g("BUSINESS QUALITY"),
    entry: g("IDEAL ENTRY"), scaleZone: g("SCALE-IN ZONE"),
    posSize: g("POSITION SIZE"), tranches: g("TRANCHES"),
    t1: g("TARGET 1"), t2: g("TARGET 2"), t3: g("TARGET 3"),
    hardStop: g("HARD STOP"), softStop: g("SOFT STOP"),
    rr: g("RISK\\/REWARD"), maxLoss: g("MAX LOSS"), maxGain: g("MAX GAIN"),
    keyAlert: g("KEY ALERT LEVEL"),
    daysToHold: g("DAYS TO HOLD"),
    timeSensitivity: g("TIME SENSITIVITY"),
    marketMood: g("MARKET MOOD"),
    topRisk: g("TOP RISK"),
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
//  SETUP CARD v11
// ─────────────────────────────────────────────────────────────
// Preflight Panel
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

function GlossaryTip({ term, children }) {
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

function SetupCard({ s, onLaunchSim, preflightScore }) {
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
  const [simulations, setSimulations] = useState([]);
  const [simHistory, setSimHistory] = useState([]);
  const [simHistTab, setSimHistTab] = useState("active");
  const [newSim, setNewSim] = useState({ sym: "", shares: "", entry: "", softStop: "", hardStop: "", t1: "", t2: "", t3: "", capital: "100000" });
  const [addSimForm, setAddSimForm] = useState(false);
  const simTimer = useRef(null);
  const [apiBalance, setApiBalance] = useState(() => { try { return parseFloat(localStorage.getItem("apex_balance") || "5.00"); } catch { return 5.00; } });
  const [apiCostLog, setApiCostLog] = useState(() => { try { return JSON.parse(localStorage.getItem("apex_cost_log") || "[]"); } catch { return []; } });
  const [showCostPanel, setShowCostPanel] = useState(false);

  // ── v11 NEW STATE ──
  const [indicators, setIndicators] = useState({});
  const [fundamentals, setFundamentals] = useState({});
  const [earningsData, setEarningsData] = useState({});
  const [globalMarkets, setGlobalMarkets] = useState([]);
  const [insiderData, setInsiderData] = useState({});
  const [preflightScore, setPreflightScore] = useState(null);
  const [lastSetupTicker, setLastSetupTicker] = useState(null);
  const [apexMemory, setApexMemory] = useState(() => { try { return JSON.parse(localStorage.getItem("apex_memory") || "{}"); } catch { return {}; } });
  const [showGlobalBrief, setShowGlobalBrief] = useState(false);
  const [showStressTest, setShowStressTest] = useState(false);
  const [backtestSym, setBacktestSym] = useState("");
  const [backtestType, setBacktestType] = useState("bullish_momentum");
  const [backtestResult, setBacktestResult] = useState(null);
  const [backtestLoading, setBacktestLoading] = useState(false);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [marketSession, setMarketSession] = useState(getMarketSession());
  const sessionTimer = useRef(null);
  const toastId = useRef(0);
  const alertId = useRef(30);
  const journalId = useRef(0);
  const scanTimer = useRef(null);
  const priceTimer = useRef(null);
  const chatEnd = useRef(null);

  useEffect(() => { chatEnd.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  // ── SESSION TIMER ──
  useEffect(() => {
    sessionTimer.current = setInterval(() => setMarketSession(getMarketSession()), 60000);
    return () => clearInterval(sessionTimer.current);
  }, []);

  // ── GLOBAL MARKETS FETCH ──
  useEffect(() => {
    const fetch = async () => {
      const data = await fetchGlobalMarkets();
      if (data.length) setGlobalMarkets(data);
    };
    fetch();
    const t = setInterval(fetch, 300000); // every 5min
    return () => clearInterval(t);
  }, []);

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
        if (d.usage) trackCost("claude-haiku-4-5-20251001", d.usage.input_tokens || 0, d.usage.output_tokens || 0, "Background Scan");
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

  // ── SIMULATION ENGINE — runs every 30s while app is open ──
  useEffect(() => {
    simTimer.current = setInterval(() => {
      setSimulations(prev => {
        const next = prev.map(sim => {
          if (sim.status === "CLOSED" || sim.status === "WAITING") return sim;
          const livePrice = prices[sim.sym]?.price;
          if (!livePrice) return sim;
          const now = new Date().toLocaleTimeString();
          const log = [...(sim.log || [])];
          let { sharesHeld, cashBack } = sim;

          // Check hard stop
          if (livePrice <= parseFloat(sim.hardStop) && sharesHeld > 0) {
            const loss = (livePrice - parseFloat(sim.entry)) * sharesHeld;
            cashBack += livePrice * sharesHeld;
            log.push({ time: now, msg: `🚨 HARD STOP HIT @ $${livePrice.toFixed(2)} — FULL EXIT`, type: "stop" });
            return { ...sim, status: "CLOSED", closeReason: "HARD_STOP", pnl: loss.toFixed(2), sharesHeld: 0, cashBack, log, closedAt: livePrice, closedTime: now };
          }
          // Check soft stop
          if (livePrice <= parseFloat(sim.softStop) && sharesHeld > 0 && !sim.softStopHit) {
            const sellShares = Math.floor(sharesHeld * 0.5);
            const loss = (livePrice - parseFloat(sim.entry)) * sellShares;
            cashBack += livePrice * sellShares;
            log.push({ time: now, msg: `⚠️ SOFT STOP @ $${livePrice.toFixed(2)} — Sold ${sellShares} shares (50%)`, type: "soft" });
            return { ...sim, softStopHit: true, sharesHeld: sharesHeld - sellShares, cashBack, log, pnl: ((cashBack - sim.totalDeployed) + (livePrice * (sharesHeld - sellShares) - parseFloat(sim.entry) * (sharesHeld - sellShares))).toFixed(2) };
          }
          // Check targets
          let updated = { ...sim, sharesHeld, cashBack, log };
          if (!sim.t1Hit && parseFloat(sim.t1) && livePrice >= parseFloat(sim.t1) && sharesHeld > 0) {
            const sellShares = Math.floor(sharesHeld * 0.3);
            const gain = (livePrice - parseFloat(sim.entry)) * sellShares;
            updated.cashBack += livePrice * sellShares;
            updated.sharesHeld -= sellShares;
            updated.t1Hit = true;
            updated.log = [...updated.log, { time: now, msg: `🎯 TARGET 1 HIT @ $${livePrice.toFixed(2)} — Sold ${sellShares} shares (+$${gain.toFixed(2)})`, type: "target" }];
          }
          if (!sim.t2Hit && parseFloat(sim.t2) && livePrice >= parseFloat(sim.t2) && updated.sharesHeld > 0) {
            const sellShares = Math.floor(updated.sharesHeld * 0.4);
            const gain = (livePrice - parseFloat(sim.entry)) * sellShares;
            updated.cashBack += livePrice * sellShares;
            updated.sharesHeld -= sellShares;
            updated.t2Hit = true;
            updated.log = [...updated.log, { time: now, msg: `🎯 TARGET 2 HIT @ $${livePrice.toFixed(2)} — Sold ${sellShares} shares (+$${gain.toFixed(2)})`, type: "target" }];
          }
          if (!sim.t3Hit && parseFloat(sim.t3) && livePrice >= parseFloat(sim.t3) && updated.sharesHeld > 0) {
            const gain = (livePrice - parseFloat(sim.entry)) * updated.sharesHeld;
            updated.cashBack += livePrice * updated.sharesHeld;
            updated.sharesHeld = 0;
            updated.t3Hit = true;
            updated.status = "CLOSED";
            updated.closeReason = "FULL_TARGET";
            updated.closedAt = livePrice;
            updated.closedTime = now;
            updated.log = [...updated.log, { time: now, msg: `🏆 TARGET 3 HIT @ $${livePrice.toFixed(2)} — FULL EXIT (+$${gain.toFixed(2)})`, type: "target" }];
          }
          const unrealized = updated.sharesHeld > 0 ? (livePrice - parseFloat(sim.entry)) * updated.sharesHeld : 0;
          const realized = updated.cashBack - (parseFloat(sim.entry) * (parseFloat(sim.shares) - updated.sharesHeld));
          updated.pnl = (unrealized + realized).toFixed(2);
          updated.livePrice = livePrice;
          updated.lastUpdated = now;
          return updated;
        });
        // Archive newly closed sims to history
        const newlyClosed = next.filter(s => s.status === "CLOSED" && !prev.find(p => p.id === s.id && p.status === "CLOSED"));
        if (newlyClosed.length > 0) {
          setSimHistory(h => [...h, ...newlyClosed.map(s => ({
            ...s,
            archivedAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
            outcome: parseFloat(s.pnl) > 0 ? (s.closeReason === "FULL_TARGET" ? "WIN" : "PARTIAL_WIN") : (s.closeReason === "HARD_STOP" ? "BAILOUT" : "LOSS"),
          }))]);
        }
        return next;
      });
    }, 30000);
    return () => clearInterval(simTimer.current);
  }, [prices]);

  const addSimulation = () => {
    const s = newSim;
    if (!s.sym || !s.entry || !s.shares) return;
    const livePrice = prices[s.sym.toUpperCase()]?.price;
    const entryP = parseFloat(s.entry);
    const shares = parseInt(s.shares);
    const totalDeployed = entryP * shares;
    const status = livePrice && livePrice <= entryP * 1.005 ? "ACTIVE" : "WAITING";
    setSimulations(prev => [...prev, {
      id: Date.now(), sym: s.sym.toUpperCase(), entry: s.entry, shares, sharesHeld: shares,
      softStop: s.softStop, hardStop: s.hardStop, t1: s.t1, t2: s.t2, t3: s.t3,
      capital: parseFloat(s.capital), totalDeployed, cashBack: 0,
      status, pnl: "0.00", livePrice: livePrice || entryP,
      t1Hit: false, t2Hit: false, t3Hit: false, softStopHit: false,
      log: [{ time: new Date().toLocaleTimeString(), msg: `📋 Simulation started — ${shares} shares @ $${s.entry} entry target`, type: "info" }],
      createdAt: new Date().toLocaleTimeString(), lastUpdated: new Date().toLocaleTimeString()
    }]);
    setNewSim({ sym: "", shares: "", entry: "", softStop: "", hardStop: "", t1: "", t2: "", t3: "", capital: "100000" });
    setAddSimForm(false);
    toast("📊 Simulation Started", `Tracking ${s.sym.toUpperCase()} paper trade`, "bull");
  };

  const manualCloseSim = (sim, reason) => {
    const livePrice = prices[sim.sym]?.price || parseFloat(sim.entry);
    const finalPnl = (livePrice - parseFloat(sim.entry)) * sim.sharesHeld + sim.cashBack - (parseFloat(sim.entry) * (sim.shares - sim.sharesHeld));
    const outcome = reason === "MANUAL_WIN" ? "WIN" : reason === "MANUAL_LOSS" ? "LOSS" : "BAILOUT";
    const closed = { ...sim, status: "CLOSED", closeReason: reason, pnl: finalPnl.toFixed(2), closedAt: livePrice, closedTime: new Date().toLocaleTimeString(), outcome, archivedAt: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(), log: [...sim.log, { time: new Date().toLocaleTimeString(), msg: `🔒 Manually closed — ${reason.replace("_", " ")}`, type: reason.includes("WIN") ? "target" : "stop" }] };
    setSimHistory(h => [...h, closed]);
    setSimulations(prev => prev.filter(s => s.id !== sim.id));
    toast("📁 Archived", `${sim.sym} trade logged as ${outcome}`, "info");
  };
  // ── COST TRACKING ──
  // Sonnet 4: $3/$15 per 1M tokens. Haiku 4: $0.80/$4 per 1M tokens.
  const trackCost = useCallback((model, inputTokens, outputTokens, label) => {
    const isSonnet = model.includes("sonnet");
    const inputRate = isSonnet ? 3.00 / 1_000_000 : 0.80 / 1_000_000;
    const outputRate = isSonnet ? 15.00 / 1_000_000 : 4.00 / 1_000_000;
    const cost = (inputTokens * inputRate) + (outputTokens * outputRate);
    const entry = { time: new Date().toLocaleTimeString(), date: new Date().toLocaleDateString(), label: label || "AI Analysis", model: isSonnet ? "Sonnet" : "Haiku", inputTokens, outputTokens, cost: cost.toFixed(6) };
    setApiCostLog(prev => {
      const next = [entry, ...prev].slice(0, 100);
      try { localStorage.setItem("apex_cost_log", JSON.stringify(next)); } catch {}
      return next;
    });
    setApiBalance(prev => {
      const next = Math.max(0, prev - cost);
      try { localStorage.setItem("apex_balance", next.toFixed(6)); } catch {}
      return next;
    });
    return cost;
  }, []);

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
      if (d.usage) trackCost("claude-sonnet-4-6", d.usage.input_tokens || 0, d.usage.output_tokens || 0, text?.substring(0, 40) + "...");
      setMessages(prev => [...prev, { role: "assistant", text: reply }]);
    } catch (e) { setMessages(prev => [...prev, { role: "assistant", text: `**Error:** ${e.message}` }]); }
    setLoading(false);
  };

  const qp = (p) => { setView("chat"); send(p, null, true); };

  const perfectSetup = async () => {
    setSetupLoading(true);
    setPreflightScore(null);

    // Run pre-flight enrichment in parallel
    const enrichContext = async () => {
      const watchSyms = watchlist.slice(0, 3).map(w => w.sym);
      const technicalCtx = [];
      for (const sym of watchSyms) {
        if (apiKeys.finnhub) {
          const candles = await fetchHistoricalCandles(sym, apiKeys.finnhub, 200);
          if (candles) {
            const ind = computeAllIndicators(candles);
            if (ind) {
              setIndicators(prev => ({ ...prev, [sym]: ind }));
              technicalCtx.push(`${sym}: 200MA=$${ind.sma200?.toFixed(0)||"?"} 50MA=$${ind.sma50?.toFixed(0)||"?"} RSI=${ind.rsi||"?"} MACD=${ind.macd?.macd>0?"Bull":"Bear"} VWAP=$${ind.vwap||"?"} Vol${ind.volVsAvg!==null?`${ind.volVsAvg>0?"+":""}${ind.volVsAvg}%vs90dAvg`:""} ${ind.goldenCross?"GoldenCross":"DeathCross"} Support=$${ind.support} Resistance=$${ind.resistance}`);
            }
          }
          const earn = await fetchEarningsDate(sym, apiKeys.finnhub);
          if (earn) setEarningsData(prev => ({ ...prev, [sym]: earn }));
        }
        if (apiKeys.alphavantage) {
          const fund = await fetchFundamentals(sym, apiKeys.alphavantage);
          if (fund) setFundamentals(prev => ({ ...prev, [sym]: fund }));
        }
      }
      return technicalCtx;
    };

    const technicalCtx = await enrichContext();
    const session = getMarketSession();
    const globalCtx = globalMarkets.slice(0, 4).map(m => `${m.name}:${m.chg >= 0 ? "+" : ""}${m.chg}%`).join(" ");
    const memCtx = apexMemory.setups?.length ? `Your history: ${apexMemory.setups.length} setups, Win rate: ${apexMemory.winRate || "unknown"}%. Best conditions: ${apexMemory.bestConditions || "building data"}` : "";

    await send(
      `Using all live market data, technical indicators, and global context below — give me today's single PERFECT buying opportunity.\n\nTECHNICAL DATA:\n${technicalCtx.join("\n") || "See live prices above"}\n\nGLOBAL OVERNIGHT: ${globalCtx || "loading"}\nMARKET SESSION: ${session.session} (${session.quality})\n${memCtx}\n\nDeliver the complete PERFECT SETUP with pre-flight score, TLDR action card, GO/WAIT/NO-GO verdict, chain of thought, bear case, and 3 scenarios. Make it institutional-grade.`,
      null, true
    );
    setSetupLoading(false);
  };
  const onImg = (e) => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setPendingImg({ base64: ev.target.result.split(",")[1], mediaType: f.type, name: f.name, preview: ev.target.result }); r.readAsDataURL(f); };

  // ── AI MEMORY ──
  const saveToMemory = (setupData) => {
    const newEntry = {
      ticker: setupData.ticker,
      date: new Date().toLocaleDateString(),
      prob: setupData.prob,
      conviction: setupData.conviction,
      fearGreed: fearGreed?.value,
      vix: prices["^VIX"]?.price,
      sessionQuality: marketSession.quality,
      outcome: null, // filled in when sim closes
    };
    setApexMemory(prev => {
      const updated = { ...prev, setups: [...(prev.setups || []), newEntry].slice(-50) };
      try { localStorage.setItem("apex_memory", JSON.stringify(updated)); } catch {}
      return updated;
    });
  };

  const getMemoryInsights = () => {
    const setups = apexMemory.setups || [];
    const closed = setups.filter(s => s.outcome !== null);
    if (closed.length < 3) return null;
    const wins = closed.filter(s => s.outcome === "WIN" || s.outcome === "PARTIAL_WIN");
    const wr = ((wins.length / closed.length) * 100).toFixed(0);
    const bestFG = wins.length ? (wins.reduce((a, b) => a + (b.fearGreed || 50), 0) / wins.length).toFixed(0) : null;
    const bestSession = wins.length ? wins.map(s => s.sessionQuality).sort((a, b) => wins.filter(w => w.sessionQuality === b).length - wins.filter(w => w.sessionQuality === a).length)[0] : null;
    return { wr, count: closed.length, bestFG, bestSession };
  };

  // ── STRESS TEST ──
  const runStressTest = (dropPct) => {
    return portfolio.map(p => {
      const cur = prices[p.sym]?.price || p.entry;
      const dropped = cur * (1 - dropPct / 100);
      const loss = (dropped - p.entry) * p.shares;
      const pct = ((dropped - p.entry) / p.entry * 100).toFixed(1);
      return { sym: p.sym, shares: p.shares, entry: p.entry, dropped: dropped.toFixed(2), loss: loss.toFixed(2), pct };
    });
  };

  // ── LAUNCH SIM FROM SETUP ──
  const launchSimFromSetup = (setup) => {
    const entry = setup.entry?.replace("$", "") || "";
    const hardStop = setup.hardStop?.match(/\$[\d.]+/)?.[0]?.replace("$", "") || "";
    const softStop = setup.softStop?.match(/\$[\d.]+/)?.[0]?.replace("$", "") || "";
    const t1 = setup.t1?.match(/\$[\d.]+/)?.[0]?.replace("$", "") || "";
    const t2 = setup.t2?.match(/\$[\d.]+/)?.[0]?.replace("$", "") || "";
    const t3 = setup.t3?.match(/\$[\d.]+/)?.[0]?.replace("$", "") || "";
    setNewSim({ sym: setup.ticker || "", shares: "100", entry, softStop, hardStop, t1, t2, t3, capital: "100000" });
    setAddSimForm(true);
    setView("sim");
    toast("📊 Setup Loaded", `${setup.ticker} parameters auto-filled in Simulator`, "bull");
  };

  // ── SIGNAL ACTIONS ──
  const favSignal = (id) => setScanAlerts(prev => prev.map(a => a.id === id ? { ...a, favorited: !a.favorited } : a));
  const runBacktestHandler = async () => {
    if (!backtestSym || !apiKeys.finnhub) return;
    setBacktestLoading(true);
    setBacktestResult(null);
    const result = await runBacktest(backtestSym.toUpperCase(), backtestType, {}, apiKeys.finnhub);
    setBacktestResult(result);
    setBacktestLoading(false);
  };
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

      {/* COST TRACKER PANEL */}
      {showCostPanel && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }} onClick={() => setShowCostPanel(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background: "#0a1520", border: `1px solid rgba(0,229,160,.2)`, borderRadius: 16, padding: "24px", width: 420, maxHeight: "80vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,.6)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
              <div style={{ fontFamily: "'Syne',sans-serif", fontWeight: 700, fontSize: 18, color: "#fff" }}>API Cost Tracker</div>
              <button onClick={() => setShowCostPanel(false)} style={{ background: "transparent", border: "none", color: "#4a6070", cursor: "pointer", fontSize: 16 }}>✕</button>
            </div>

            {/* Balance Card */}
            <div style={{ background: apiBalance < 1 ? "rgba(255,68,102,.08)" : "linear-gradient(135deg,rgba(0,229,160,.08),rgba(0,170,255,.04))", border: `1px solid ${apiBalance < 1 ? "rgba(255,68,102,.25)" : "rgba(0,229,160,.25)"}`, borderRadius: 12, padding: "18px", marginBottom: 16, textAlign: "center" }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 2, marginBottom: 6 }}>Remaining Balance</div>
              <div style={{ fontSize: 42, fontWeight: 700, fontFamily: "'Syne',sans-serif", color: apiBalance < 0.5 ? R : apiBalance < 1.5 ? Y : G }}>${parseFloat(apiBalance).toFixed(4)}</div>
              <div style={{ fontSize: 10, fontFamily: "monospace", color: "#4a6070", marginTop: 4 }}>of $5.00 original balance</div>
              <div style={{ marginTop: 12, background: "rgba(0,0,0,.3)", borderRadius: 6, height: 6, overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.min(100, (parseFloat(apiBalance) / 5) * 100)}%`, background: apiBalance < 0.5 ? R : apiBalance < 1.5 ? Y : G, borderRadius: 6, transition: "width .5s ease" }} />
              </div>
              {apiBalance < 1 && <div style={{ marginTop: 8, fontSize: 10, fontFamily: "monospace", color: R }}>⚠️ Low balance — add credits at console.anthropic.com</div>}
            </div>

            {/* Stats Row */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 }}>
              {[
                { l: "Total Spent", v: `$${(5 - parseFloat(apiBalance)).toFixed(4)}` },
                { l: "Requests", v: apiCostLog.length },
                { l: "Avg/Request", v: apiCostLog.length ? `$${(apiCostLog.reduce((a, c) => a + parseFloat(c.cost), 0) / apiCostLog.length).toFixed(4)}` : "—" },
              ].map(({ l, v }) => (
                <div key={l} style={{ background: "rgba(0,0,0,.3)", borderRadius: 8, padding: "10px 10px" }}>
                  <div style={{ fontSize: 8, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", marginBottom: 3 }}>{l}</div>
                  <div style={{ fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: "#c8d8e8" }}>{v}</div>
                </div>
              ))}
            </div>

            {/* Adjust Balance */}
            <div style={{ background: "rgba(0,0,0,.3)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Set Balance (after adding credits)</div>
              <div style={{ display: "flex", gap: 8 }}>
                {[5, 10, 20, 50].map(amt => (
                  <button key={amt} onClick={() => { setApiBalance(amt); try { localStorage.setItem("apex_balance", amt); } catch {} }} style={{ flex: 1, padding: "6px", borderRadius: 7, background: "transparent", border: `1px solid ${BOR}`, color: "#4a6070", fontSize: 11, cursor: "pointer", fontFamily: "monospace" }}>${amt}</button>
                ))}
              </div>
            </div>

            {/* Cost Log */}
            <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Recent Requests</div>
            {apiCostLog.length === 0 && <div style={{ textAlign: "center", padding: "20px", color: "#162030", fontFamily: "monospace", fontSize: 11 }}>No requests yet. Use Perfect Setup or Chat to see costs here.</div>}
            {apiCostLog.slice(0, 20).map((entry, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "7px 10px", background: i % 2 === 0 ? "rgba(0,0,0,.2)" : "transparent", borderRadius: 6, marginBottom: 2 }}>
                <div>
                  <div style={{ fontSize: 11, fontFamily: "monospace", color: "#8899bb" }}>{entry.label}</div>
                  <div style={{ fontSize: 9, fontFamily: "monospace", color: "#2a4050" }}>{entry.model} · {entry.inputTokens}in / {entry.outputTokens}out · {entry.time}</div>
                </div>
                <div style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: R }}>-${entry.cost}</div>
              </div>
            ))}
            {apiCostLog.length > 0 && (
              <button onClick={() => { setApiCostLog([]); try { localStorage.removeItem("apex_cost_log"); } catch {} }} style={{ width: "100%", padding: "7px", borderRadius: 8, background: "transparent", border: `1px solid ${BOR}`, color: "#2a4050", fontSize: 10, cursor: "pointer", fontFamily: "monospace", marginTop: 8 }}>🗑 Clear Log</button>
            )}
          </div>
        </div>
      )}

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
            <div style={{ fontFamily: "monospace", fontSize: 7, color: G, letterSpacing: 3, opacity: .7 }}>ELITE MARKET INTELLIGENCE v11</div>
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
          {marketSession.open && <span style={{ fontFamily: "monospace", fontSize: 9, color: marketSession.quality === "prime" ? G : marketSession.quality === "avoid" ? R : "#4a6070", border: `1px solid ${marketSession.quality === "prime" ? "rgba(0,229,160,.3)" : "rgba(255,255,255,.06)"}`, borderRadius: 4, padding: "2px 6px" }}>{marketSession.session}</span>}
          <button onClick={() => setShowCostPanel(v => !v)} title="API Balance & Cost Tracker" style={{ background: apiBalance < 1 ? "rgba(255,68,102,.1)" : "rgba(0,229,160,.07)", border: `1px solid ${apiBalance < 1 ? R+"44" : G+"44"}`, borderRadius: 6, color: apiBalance < 1 ? R : G, fontSize: 10, cursor: "pointer", padding: "3px 9px", fontFamily: "monospace", display: "flex", alignItems: "center", gap: 4 }}>
            💳 ${parseFloat(apiBalance).toFixed(3)}
          </button>
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

      {/* MAIN */}
      <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: BG }}>
        <div style={{ display: "flex", gap: 2, padding: "7px 14px 0", borderBottom: `1px solid ${BOR}`, background: S1 }}>
          {[{ id: "chat", l: "💬 Chat" }, { id: "signals", l: "⬡ Signals" }, { id: "portfolio", l: "◈ Portfolio" }, { id: "journal", l: "◉ Journal" }, { id: "sim", l: "⚗ Sim" }, { id: "risk", l: "◇ Risk" }, { id: "backtest", l: "⌖ Test" }].map(t => (
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
                <>
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
                </>
              )}

              {/* HISTORY TAB */}
              {simHistTab === "history" && (
                <>
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
                </>
              )}

              {/* STATS / ANALYTICS TAB */}
              {simHistTab === "stats" && (
                <>
                  {total === 0 && <div style={{ textAlign: "center", padding: "50px 20px", color: "#2a4050", fontFamily: "monospace", fontSize: 12 }}>No data yet. Complete some simulations to see analytics.</div>}
                  {total > 0 && (
                    <>
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
                    </>
                  )}
                </>
              )}

              {/* WEEKLY REPORT TAB */}
              {simHistTab === "report" && (
                <>
                  <div style={{ background: "linear-gradient(135deg,rgba(0,229,160,.07),rgba(0,170,255,.04))", border: `1px solid rgba(0,229,160,.2)`, borderRadius: 12, padding: "16px", marginBottom: 14 }}>
                    <div style={{ fontSize: 9, fontFamily: "monospace", color: G, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>📋 Weekly Performance Report</div>
                    {total === 0 ? (
                      <div style={{ textAlign: "center", padding: "20px", color: "#2a4050", fontFamily: "monospace", fontSize: 11 }}>Complete some simulations to generate your weekly report.</div>
                    ) : (
                      <>
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
                      </>
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
                </>
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
      </div>

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
          </div>
        )}

      </div>

      {/* RIGHT SIDEBAR */}
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
    </div>
  );
}
