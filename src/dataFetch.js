import { API_REGISTRY } from './constants';

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
export async function fetchPolygonPrice(symbol, apiKey) {
  try {
    const res = await fetch(`https://api.polygon.io/v2/last/trade/${symbol}?apiKey=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    if (!d.results?.p) return null;
    return { price: +d.results.p.toFixed(2), chg: 0, high: 0, low: 0, prev: 0, open: 0, realtime: true };
  } catch { return null; }
}

// Twelve Data — international fallback
export async function fetchTwelvePrice(symbol, apiKey) {
  try {
    const res = await fetch(`https://api.twelvedata.com/price?symbol=${symbol}&apikey=${apiKey}`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    if (!d.price) return null;
    return { price: +parseFloat(d.price).toFixed(2), chg: 0, high: 0, low: 0, prev: 0, open: 0 };
  } catch { return null; }
}

// Smart fetch — uses best available key
export async function fetchPrice(symbol, keys) {
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

export async function fetchAllPrices(symbols, keys) {
  const results = {};
  await Promise.allSettled(symbols.map(async (sym) => {
    const d = await fetchPrice(sym, keys);
    if (d) results[sym] = d;
  }));
  return results;
}

// Finnhub news
export async function fetchFinnhubNews(apiKey) {
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
export async function fetchRSSNews() {
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
export async function fetchFearGreed() {
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", { signal: AbortSignal.timeout(6000) });
    const d = await res.json();
    const val = d?.data?.[0];
    return val ? { value: parseInt(val.value), label: val.value_classification } : null;
  } catch { return null; }
}

// FRED macro
export async function fetchFREDSeries(seriesId, apiKey) {
  try {
    const res = await fetch(`https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=1&sort_order=desc`, { signal: AbortSignal.timeout(8000) });
    const d = await res.json();
    return d?.observations?.[0]?.value || null;
  } catch { return null; }
}

export function getTimeAgo(date) {
  const mins = Math.floor((Date.now() - date) / 60000);
  if (isNaN(mins) || mins < 0) return "recent";
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}d`;
}

// ── TECHNICAL INDICATORS ──
export async function fetchHistoricalCandles(symbol, apiKey, days = 200) {
  try {
    const to = Math.floor(Date.now() / 1000);
    const from = to - days * 86400;
    const res = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${symbol}&resolution=D&from=${from}&to=${to}&token=${apiKey}`, { signal: AbortSignal.timeout(10000) });
    const d = await res.json();
    if (d.s !== "ok" || !d.c?.length) return null;
    return { close: d.c, high: d.h, low: d.l, open: d.o, volume: d.v, time: d.t };
  } catch { return null; }
}

export function calcSMA(closes, period) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calcRSI(closes, period = 14) {
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

export function calcEMA(closes, period) {
  if (closes.length < period) return null;
  const k = 2 / (period + 1);
  let ema = closes.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < closes.length; i++) ema = closes[i] * k + ema * (1 - k);
  return +ema.toFixed(2);
}

export function calcMACD(closes) {
  const ema12 = calcEMA(closes, 12);
  const ema26 = calcEMA(closes, 26);
  if (!ema12 || !ema26) return null;
  const macdLine = +(ema12 - ema26).toFixed(2);
  return { macd: macdLine, signal: null, histogram: null };
}

export function calcBollinger(closes, period = 20) {
  if (closes.length < period) return null;
  const slice = closes.slice(-period);
  const sma = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((a, b) => a + Math.pow(b - sma, 2), 0) / period;
  const std = Math.sqrt(variance);
  return { upper: +(sma + 2 * std).toFixed(2), middle: +sma.toFixed(2), lower: +(sma - 2 * std).toFixed(2), bandwidth: +((std * 4 / sma) * 100).toFixed(1) };
}

export function calcVWAP(candles) {
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

export function calcSupportResistance(candles) {
  if (!candles?.close?.length) return { support: null, resistance: null };
  const closes = candles.close.slice(-50);
  const highs = candles.high.slice(-50);
  const lows = candles.low.slice(-50);
  const support = +Math.min(...lows.slice(-20)).toFixed(2);
  const resistance = +Math.max(...highs.slice(-20)).toFixed(2);
  return { support, resistance };
}

export function computeAllIndicators(candles) {
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
export async function fetchFundamentals(symbol, apiKey) {
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
export async function fetchEarningsDate(symbol, apiKey) {
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
export async function fetchInsiderTransactions(symbol) {
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
export async function fetchGlobalMarkets() {
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
export async function runBacktest(symbol, setupType, indicators, apiKey) {
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