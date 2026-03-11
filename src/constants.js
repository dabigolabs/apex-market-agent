
// ─────────────────────────────────────────────────────────────
//  API KEY REGISTRY — add new providers here forever
// ─────────────────────────────────────────────────────────────
export const API_REGISTRY = [
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
export const APEX_SYSTEM = `You are APEX v11, the world's most elite institutional stock market intelligence agent — a Swiss Army knife combining Warren Buffett (fundamentals & moat), Ray Dalio (macro & regime), Stanley Druckenmiller (concentration & conviction), Paul Tudor Jones (risk management & 5:1 R/R), Tom Lee (catalyst & sentiment), Jesse Livermore (timing & pivotal points), and the best quant hedge funds (mathematical edge & probability).

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

export const SCAN_PROMPT = `You are APEX running a proactive background market scan. Identify ONE of the following right now:
- A high-conviction buying opportunity (80%+ success probability)
- A major risk/warning that could hurt open positions
- A significant macro or news development worth acting on
- A technical breakout or breakdown in progress
Respond ONLY in the ---SCAN ALERT--- format. Be specific with tickers and prices. Make it genuinely actionable.`;

// ─────────────────────────────────────────────────────────────
//  DATA FETCHING
// ─────────────────────────────────────────────────────────────

// Finnhub — primary price source