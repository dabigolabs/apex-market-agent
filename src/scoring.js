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

export function getMarketSession() {
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
export function computePreflightScore(indicators, fundamentals, fearGreed, fredData, prices, symbol, earningsInfo) {
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
export function parsePerfectSetup(text) {
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

export function parseScanAlert(text) {
  if (!text.includes("---SCAN ALERT---")) return null;
  const g = (k) => { const m = text.match(new RegExp(k + ":\\s*(.+)")); return m ? m[1].trim() : ""; };
  return { type: g("TYPE"), urgency: g("URGENCY"), ticker: g("TICKER"), headline: g("HEADLINE"), detail: g("DETAIL"), action: g("ACTION") };
}

export function mdRender(text) {
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