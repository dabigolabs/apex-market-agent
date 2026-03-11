import { useState, useRef, useEffect, useCallback } from "react";
import { API_REGISTRY, APEX_SYSTEM, SCAN_PROMPT } from './constants';
import {
  fetchPrice, fetchAllPrices, fetchFinnhubNews, fetchRSSNews,
  fetchFearGreed, fetchFREDSeries, fetchHistoricalCandles,
  computeAllIndicators, fetchFundamentals, fetchEarningsDate,
  fetchInsiderTransactions, fetchGlobalMarkets, runBacktest, getTimeAgo
} from './dataFetch';
import {
  isMarketOpen, getMarketSession, computePreflightScore,
  parsePerfectSetup, parseScanAlert, mdRender
} from './scoring';
import { PreflightPanel, GlossaryTip, SetupCard, ScanCard, APISettings } from './components';
import { ChatPanel } from './ChatPanel';
import { WorkPanel } from './WorkPanel';
import { SimPanel } from './SimPanel';
import { RiskPanel } from './RiskPanel';
import { LeftSidebar } from './LeftSidebar';
import { RightSidebar } from './RightSidebar';

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


      <LeftSidebar
        BG={BG}
          BOR={BOR}
          G={G}
          Inp={Inp}
          R={R}
          S1={S1}
          S2={S2}
          Y={Y}
          addWForm={addWForm}
          addWatch={addWatch}
          fearGreed={fearGreed}
          hasKey={hasKey}
          journal={journal}
          loading={loading}
          macroDisplay={macroDisplay}
          markAllRead={markAllRead}
          newW={newW}
          notifCount={notifCount}
          perfectSetup={perfectSetup}
          portfolio={portfolio}
          prices={prices}
          qp={qp}
          setAddWForm={setAddWForm}
          setNewW={setNewW}
          setShowSettings={setShowSettings}
          setView={setView}
          setWatchlist={setWatchlist}
          setupLoading={setupLoading}
          view={view}
          watchlist={watchlist}
      />

            <div style={{ display: "flex", flexDirection: "column", overflow: "hidden", background: BG }}>
        <div style={{ display: "flex", gap: 2, padding: "7px 14px 0", borderBottom: `1px solid ${BOR}`, background: S1 }}>
                    {[{ id: "chat", l: "💬 Chat" }, { id: "signals", l: "⬡ Signals" }, { id: "portfolio", l: "◈ Portfolio" }, { id: "journal", l: "◉ Journal" }, { id: "sim", l: "⚗ Sim" }, { id: "risk", l: "◇ Risk" }, { id: "backtest", l: "⌖ Test" }].map(t => (
            <div key={t.id} onClick={() => { setView(t.id); if (t.id === "signals") markAllRead(); }}
              style={{ padding: "6px 12px", borderRadius: "6px 6px 0 0", fontSize: 11, fontWeight: 500, cursor: "pointer", color: view === t.id ? G : "#2a4050", background: view === t.id ? BG : "transparent", border: view === t.id ? `1px solid ${BOR}` : "1px solid transparent", borderBottom: view === t.id ? `1px solid ${BG}` : "1px solid transparent", marginBottom: -1, transition: ".15s", whiteSpace: "nowrap" }}>
              {t.l}
            </div>
          ))}
        </div>

        </div>

        {view === "chat" && <ChatPanel
          B={B}
          BOR={BOR}
          G={G}
          R={R}
          S1={S1}
          S2={S2}
          Y={Y}
          chatEnd={chatEnd}
          earningsData={earningsData}
          fundamentals={fundamentals}
          hasKey={hasKey}
          indicators={indicators}
          input={input}
          launchSimFromSetup={launchSimFromSetup}
          loading={loading}
          messages={messages}
          onImg={onImg}
          pendingImg={pendingImg}
          preflightScore={preflightScore}
          prices={prices}
          qp={qp}
          send={send}
          setInput={setInput}
          setPendingImg={setPendingImg}
          setShowSettings={setShowSettings}
          view={view}
        />}
        {(view === "signals" || view === "portfolio" || view === "journal") && <WorkPanel
          BOR={BOR}
          Btn={Btn}
          G={G}
          Inp={Inp}
          R={R}
          S2={S2}
          Y={Y}
          addPForm={addPForm}
          clearAll={clearAll}
          clearDismissed={clearDismissed}
          dismissSignal={dismissSignal}
          favSignal={favSignal}
          filteredAlerts={filteredAlerts}
          journal={journal}
          journalForm={journalForm}
          journalId={journalId}
          markAllRead={markAllRead}
          newJ={newJ}
          newP={newP}
          pStats={pStats}
          portfolio={portfolio}
          prices={prices}
          qp={qp}
          runStressTest={runStressTest}
          scanActive={scanActive}
          scanAlerts={scanAlerts}
          setAddPForm={setAddPForm}
          setJournal={setJournal}
          setJournalForm={setJournalForm}
          setNewJ={setNewJ}
          setNewP={setNewP}
          setPortfolio={setPortfolio}
          setScanActive={setScanActive}
          setShowStressTest={setShowStressTest}
          setSignalFilter={setSignalFilter}
          showStressTest={showStressTest}
          signalFilter={signalFilter}
          toast={toast}
          view={view}
        />}
        {(view === "sim" || view === "stats" || view === "weekly") && <SimPanel
          B={B}
          BOR={BOR}
          G={G}
          Inp={Inp}
          R={R}
          S2={S2}
          Y={Y}
          addSimForm={addSimForm}
          addSimulation={addSimulation}
          getMemoryInsights={getMemoryInsights}
          lastUpdated={lastUpdated}
          manualCloseSim={manualCloseSim}
          newSim={newSim}
          prices={prices}
          qp={qp}
          setAddSimForm={setAddSimForm}
          setNewSim={setNewSim}
          setSimHistTab={setSimHistTab}
          setSimHistory={setSimHistory}
          simHistTab={simHistTab}
          simHistory={simHistory}
          simulations={simulations}
          view={view}
        />}
        {(view === "risk" || view === "backtest") && <RiskPanel
          BOR={BOR}
          G={G}
          Inp={Inp}
          R={R}
          S1={S1}
          S2={S2}
          Sel={Sel}
          Y={Y}
          apiKeys={apiKeys}
          backtestLoading={backtestLoading}
          backtestResult={backtestResult}
          backtestSym={backtestSym}
          backtestType={backtestType}
          calcRisk={calcRisk}
          qp={qp}
          riskResult={riskResult}
          riskVal={riskVal}
          runBacktestHandler={runBacktestHandler}
          setBacktestSym={setBacktestSym}
          setBacktestType={setBacktestType}
          setRiskVal={setRiskVal}
          view={view}
        />}
      </div>

      <RightSidebar
        B={B}
          BOR={BOR}
          Btn={Btn}
          G={G}
          Inp={Inp}
          R={R}
          S1={S1}
          S2={S2}
          Sel={Sel}
          Y={Y}
          addAForm={addAForm}
          alertId={alertId}
          cpi={cpi}
          fredData={fredData}
          getMemoryInsights={getMemoryInsights}
          globalMarkets={globalMarkets}
          hasKey={hasKey}
          macroDisplay={macroDisplay}
          marketSession={marketSession}
          newA={newA}
          news={news}
          priceAlerts={priceAlerts}
          prices={prices}
          qp={qp}
          rpTab={rpTab}
          setAddAForm={setAddAForm}
          setNewA={setNewA}
          setPriceAlerts={setPriceAlerts}
          setRpTab={setRpTab}
          setShowSettings={setShowSettings}
          tagBg={tagBg}
          tagC={tagC}
          toast={toast}
      />
    </div>
  );
}
