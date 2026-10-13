'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { 
  ArrowUpRight, 
  ArrowDownRight,
  Filter,
  Sparkles,
  Bot,
  Activity,
  RefreshCw,
  Settings,
  Key,
  Check,
  Copy,
  CheckCircle2,
  X,
  Flame,
  Clock,
  BookOpen
} from 'lucide-react';
import { Instrument, GeneratedAISignal, Timeframe } from '../types/market';
import { 
  generateMarketSignals, 
  getTechnicalOverview, 
  getTimeframeMatrix 
} from '../services/signalEngine';

export interface SidePanelRightProps {
  instruments: Instrument[];
  selectedInstrument: Instrument;
  timeframe?: Timeframe;
  onTimeframeChange?: (tf: Timeframe) => void;
  onSelectInstrument: (inst: Instrument) => void;
  onOpenJournal?: () => void;
  onOpenJournalWithSignal?: (signal: GeneratedAISignal) => void;
}

export const AnalyticsPanelRight: React.FC<SidePanelRightProps> = ({
  instruments,
  selectedInstrument,
  timeframe = '1h',
  onTimeframeChange,
  onSelectInstrument,
  onOpenJournal,
  onOpenJournalWithSignal,
}) => {
  const [activeTab, setActiveTab] = useState<'ai-signal' | 'signals' | 'technical' | 'market'>('ai-signal');
  const [signalFilter, setSignalFilter] = useState<'all' | 'crypto' | 'forex' | 'bullish' | 'bearish'>('all');
  const [aiTimeframe, setAiTimeframe] = useState<Timeframe>(timeframe);

  useEffect(() => {
    if (timeframe) {
      setAiTimeframe(timeframe);
    }
  }, [timeframe]);

  // --- AI SIGNAL GENERATOR STATE ---
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [generatedSignal, setGeneratedSignal] = useState<GeneratedAISignal | null>(null);
  const [aiProvider, setAiProvider] = useState<'auto' | '9router' | 'gemini' | 'openai'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('betatech_ai_provider');
      if (saved === 'auto' || saved === '9router' || saved === 'openai' || saved === 'gemini') return saved;
    }
    return 'auto';
  });
  const [routerUrl, setRouterUrl] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('betatech_router_url') || 'http://127.0.0.1:20128/v1';
    }
    return 'http://127.0.0.1:20128/v1';
  });
  const [routerModel, setRouterModel] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('betatech_router_model') || 'auto';
    }
    return 'auto';
  });
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('betatech_ai_key') || '';
    }
    return '';
  });
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);
  const [keySavedToast, setKeySavedToast] = useState<boolean>(false);
  const [signalCopied, setSignalCopied] = useState<boolean>(false);

  // Save API key settings to localStorage
  const handleSaveApiSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('betatech_ai_key', customApiKey.trim());
      localStorage.setItem('betatech_ai_provider', aiProvider);
      localStorage.setItem('betatech_router_url', routerUrl.trim());
      localStorage.setItem('betatech_router_model', routerModel.trim());
      setKeySavedToast(true);
      setTimeout(() => setKeySavedToast(false), 2500);
      setShowConfigDrawer(false);
    }
  };

  // Trigger AI Signal Generation via Next.js API Route
  const handleGenerateAISignal = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai-signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          symbol: selectedInstrument.symbol,
          timeframe: aiTimeframe,
          currentPrice: selectedInstrument.price,
          apiKey: customApiKey.trim() || undefined,
          provider: aiProvider,
          routerUrl: routerUrl.trim() || undefined,
          model: routerModel.trim() || 'auto',
        }),
      });

      if (res.ok) {
        const data: GeneratedAISignal = await res.json();
        setGeneratedSignal(data);
      } else {
        console.error('Failed to generate AI signal:', res.statusText);
      }
    } catch (err) {
      console.error('Error fetching AI signal:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Scanner signals across all pairs
  const allSignals = useMemo(() => {
    return generateMarketSignals(instruments);
  }, [instruments]);

  // Filtered signals
  const filteredSignals = useMemo(() => {
    return allSignals.filter((sig) => {
      if (signalFilter === 'all') return true;
      if (signalFilter === 'crypto') return sig.assetType === 'crypto';
      if (signalFilter === 'forex') return sig.assetType === 'forex';
      if (signalFilter === 'bullish') return sig.direction === 'BULLISH';
      if (signalFilter === 'bearish') return sig.direction === 'BEARISH';
      return true;
    });
  }, [allSignals, signalFilter]);

  // Current instrument technical overview
  const technical = useMemo(() => {
    return getTechnicalOverview(selectedInstrument);
  }, [selectedInstrument]);

  // Multi-timeframe trend matrix
  const tfMatrix = useMemo(() => {
    return getTimeframeMatrix(selectedInstrument);
  }, [selectedInstrument]);

  // 24h range percentage calculation
  const range = selectedInstrument.high24h - selectedInstrument.low24h || 1;
  const currentRangePosition = Math.min(
    100,
    Math.max(0, Math.round(((selectedInstrument.price - selectedInstrument.low24h) / range) * 100))
  );

  return (
    <aside className="w-full lg:w-80 xl:w-96 h-full bg-[#090D18] border-l border-slate-800/80 flex flex-col overflow-hidden text-xs">
      {/* Top Header & Tab Switcher */}
      <div className="p-3 bg-[#0B0F1C] border-b border-slate-800/80 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-slate-200">
            <Sparkles className="w-4 h-4 text-[#00F0FF] animate-pulse" />
            <span className="text-sm font-bold bg-gradient-to-r from-white via-slate-100 to-[#00F0FF] bg-clip-text text-transparent">
              AI Market Intelligence
            </span>
          </div>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live AI
          </span>
        </div>

        {/* Tab Buttons (4 Tabs) */}
        <div className="grid grid-cols-4 p-0.5 bg-[#070A12] rounded-lg border border-slate-800/80 text-[11px] font-medium">
          <button
            onClick={() => setActiveTab('ai-signal')}
            className={`py-1.5 rounded transition-all text-center flex items-center justify-center gap-1 ${
              activeTab === 'ai-signal'
                ? 'bg-[#00F0FF]/15 text-[#00F0FF] font-bold border border-[#00F0FF]/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3 h-3" />
            <span>AI Signal</span>
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={`py-1.5 rounded transition-all text-center ${
              activeTab === 'signals'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`py-1.5 rounded transition-all text-center ${
              activeTab === 'technical'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Teknikal
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`py-1.5 rounded transition-all text-center ${
              activeTab === 'market'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Screener
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: AI SIGNAL GENERATOR WIDGET */}
      {/* ======================================================== */}
      {activeTab === 'ai-signal' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* AI Engine Status Header Card */}
          <div className="p-3 rounded-xl bg-[#0F1626] border border-emerald-500/30 glow-emerald-sm space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex items-center justify-center">
                  <span className="h-3 w-3 rounded-full bg-emerald-400 animate-ping absolute" />
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                </div>
                <span className="font-bold text-white text-xs">
                  AI Signal Generator
                </span>
              </div>
              
              {/* Settings Toggle Button */}
              <button
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="p-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-[#00F0FF] border border-slate-800 transition-colors flex items-center gap-1 text-[11px]"
                title="Konfigurasi API Key (Gemini / OpenAI)"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px] hidden sm:inline">API Config</span>
              </button>
            </div>

            {/* API Configuration Drawer */}
            {showConfigDrawer && (
              <div className="p-3 rounded-lg bg-[#0B0F1C] border border-[#00F0FF]/30 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-[11px] font-bold text-[#00F0FF]">
                  <span className="flex items-center gap-1.5">
                    <Key className="w-3 h-3" />
                    Konfigurasi Model & API Key
                  </span>
                  <button onClick={() => setShowConfigDrawer(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Provider Radio Tabs */}
                <div className="grid grid-cols-3 gap-1 p-1 bg-black/50 rounded-lg border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setAiProvider('auto')}
                    className={`py-1 rounded font-semibold transition-all ${
                      aiProvider === 'auto' || aiProvider === '9router'
                        ? 'bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚡ 9Router OP
                  </button>
                  <button
                    onClick={() => setAiProvider('gemini')}
                    className={`py-1 rounded font-semibold transition-all ${
                      aiProvider === 'gemini'
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Gemini API
                  </button>
                  <button
                    onClick={() => setAiProvider('openai')}
                    className={`py-1 rounded font-semibold transition-all ${
                      aiProvider === 'openai'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OpenAI GPT
                  </button>
                </div>

                {/* 9Router Specific Controls */}
                {(aiProvider === 'auto' || aiProvider === '9router') && (
                  <div className="space-y-1.5 pt-0.5">
                    <div>
                      <label className="text-[10px] text-slate-400 block font-mono">
                        9Router Base URL
                      </label>
                      <input
                        type="text"
                        value={routerUrl}
                        onChange={(e) => setRouterUrl(e.target.value)}
                        placeholder="http://127.0.0.1:20128/v1"
                        className="w-full px-2.5 py-1 bg-black/60 text-xs font-mono text-white rounded border border-slate-700 focus:outline-none focus:border-[#00F0FF]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-400 block font-mono">
                        Model AI (Ketik &apos;auto&apos; untuk rotasi OP model)
                      </label>
                      <input
                        type="text"
                        value={routerModel}
                        onChange={(e) => setRouterModel(e.target.value)}
                        placeholder="auto (Claude 5.5, Gemini 3.8, DeepSeek, Grok)"
                        className="w-full px-2.5 py-1 bg-black/60 text-xs font-mono text-white rounded border border-slate-700 focus:outline-none focus:border-[#00F0FF]"
                      />
                    </div>
                  </div>
                )}

                {/* API Key Input */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-mono">
                    {aiProvider === 'gemini' 
                      ? 'Gemini API Key' 
                      : aiProvider === 'openai' 
                      ? 'OpenAI API Key' 
                      : '9Router API Key (Opsional / Auto-Detect)'}
                  </label>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder={
                      aiProvider === 'gemini' 
                        ? 'AIzaSy...' 
                        : aiProvider === 'openai' 
                        ? 'sk-...' 
                        : 'Auto-detect dari SQLite 9Router lokal'
                    }
                    className="w-full px-2.5 py-1.5 bg-black/60 text-xs font-mono text-white rounded border border-slate-700 focus:outline-none focus:border-[#00F0FF]"
                  />
                  <p className="text-[9px] text-slate-500 leading-tight">
                    {aiProvider === 'auto' || aiProvider === '9router'
                      ? '*9Router otomatis mendeteksi model paling OP yang sedang aktif & memutar akun tanpa hambatan.'
                      : '*Jika dikosongkan, widget otomatis menggunakan Quant Algorithmic Engine internal tanpa error.'}
                  </p>
                </div>

                <button
                  onClick={handleSaveApiSettings}
                  className="w-full py-1.5 bg-[#00F0FF] hover:bg-[#00F0FF]/90 text-black font-bold text-xs rounded transition-colors"
                >
                  Simpan Pengaturan
                </button>
              </div>
            )}

            {/* Toast for saved key */}
            {keySavedToast && (
              <div className="p-1.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] flex items-center gap-1.5 border border-emerald-500/40">
                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                <span>Pengaturan API berhasil disimpan!</span>
              </div>
            )}

            {/* Timeframe Selector for AI Analysis */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Timeframe Analisis</span>
                <span className="text-[#00F0FF] font-bold">{aiTimeframe}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 p-0.5 bg-black/50 rounded-lg border border-slate-800 text-[10px] font-mono">
                {(['15m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setAiTimeframe(tf);
                      if (onTimeframeChange) onTimeframeChange(tf);
                    }}
                    className={`py-1 rounded font-semibold transition-all ${
                      aiTimeframe === tf
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Generate AI Trigger Button */}
            <button
              onClick={handleGenerateAISignal}
              disabled={isAnalyzing}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#00F0FF]/90 to-[#10B981] hover:opacity-95 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-cyan transition-all shadow-md active:scale-98 disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-black" />
                  <span>Menganalisis Kuantitatif & Candlestick...</span>
                </>
              ) : (
                <>
                  <Bot className="w-4 h-4 fill-black" />
                  <span>⚡ Analisis Sinyal {selectedInstrument.symbol} Sekarang</span>
                </>
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* KARTU SINYAL MENARIK (HASIL GENERATED DARI API ROUTE) */}
          {/* ======================================================== */}
          {generatedSignal ? (
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0B101D] to-[#0E1528] border border-[#00F0FF]/40 glow-cyan-sm space-y-3 animate-in fade-in zoom-in-95 duration-200">
              {/* Header Kartu: Simbol, Sinyal Badge & Provider */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{generatedSignal.symbol}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {generatedSignal.timeframe}
                    </span>
                    {generatedSignal.riskRewardRatio && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        R:R 1:{generatedSignal.riskRewardRatio}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mt-0.5">
                    <Clock className="w-3 h-3 text-[#00F0FF]" />
                    <span>{generatedSignal.analyzedAt}</span>
                    <span>•</span>
                    <span className="uppercase text-[#00F0FF] font-semibold">{generatedSignal.provider}</span>
                  </div>
                </div>

                {/* Signal Badge: BUY / SELL / WAIT */}
                <div>
                  <span
                    className={`text-xs font-black px-3 py-1 rounded-full flex items-center gap-1.5 ${
                      generatedSignal.signal === 'BUY'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 glow-emerald'
                        : generatedSignal.signal === 'SELL'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 glow-rose'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>{generatedSignal.signal}</span>
                  </span>
                </div>
              </div>

              {/* Confidence Score Bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Activity className="w-3 h-3 text-[#00F0FF]" />
                    Tingkat Akurasi (Confidence)
                  </span>
                  <span className="font-mono font-bold text-[#00F0FF] text-xs">
                    {generatedSignal.confidence}% Akurat
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      generatedSignal.signal === 'BUY'
                        ? 'bg-gradient-to-r from-emerald-500 to-[#00F0FF]'
                        : generatedSignal.signal === 'SELL'
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : 'bg-gradient-to-r from-slate-500 to-amber-400'
                    }`}
                    style={{ width: `${generatedSignal.confidence}%` }}
                  />
                </div>
              </div>

              {/* Indikator Snapshot (RSI, Moving Average, MACD, ATR) */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">RSI (14)</div>
                  <div className="flex items-baseline gap-1 mt-0.5">
                    <span className="text-white font-bold">{generatedSignal.indicators.rsi}</span>
                    <span className={`text-[9px] px-1 rounded ${
                      generatedSignal.indicators.rsi < 35 
                        ? 'text-emerald-400 bg-emerald-500/10' 
                        : generatedSignal.indicators.rsi > 65 
                        ? 'text-rose-400 bg-rose-500/10' 
                        : 'text-amber-400 bg-amber-500/10'
                    }`}>
                      {generatedSignal.indicators.rsiStatus || (generatedSignal.indicators.rsi < 35 ? 'Oversold' : generatedSignal.indicators.rsi > 65 ? 'Overbought' : 'Netral')}
                    </span>
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">Moving Average</div>
                  <div className="text-slate-200 font-bold mt-0.5 truncate text-[10px]">
                    MA20: ${generatedSignal.indicators.maShort}
                  </div>
                  <div className="text-slate-400 text-[9px] truncate">
                    MA50: ${generatedSignal.indicators.maLong}
                  </div>
                </div>

                {generatedSignal.indicators.macd && (
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase font-sans">MACD (12, 26, 9)</div>
                    <div className="flex items-baseline gap-1 mt-0.5">
                      <span className={`font-bold ${generatedSignal.indicators.macd.histogram >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {generatedSignal.indicators.macd.histogram >= 0 ? '+' : ''}{generatedSignal.indicators.macd.histogram}
                      </span>
                      <span className="text-[9px] text-slate-400">
                        {generatedSignal.indicators.macd.trend}
                      </span>
                    </div>
                  </div>
                )}

                {generatedSignal.indicators.atr && (
                  <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                    <div className="text-[9px] text-slate-400 uppercase font-sans">Volatilitas (ATR)</div>
                    <div className="text-slate-200 font-bold mt-0.5 truncate text-[10px]">
                      ±${generatedSignal.indicators.atr}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Tren MA */}
              <div className="px-2.5 py-1.5 rounded-lg bg-slate-900/60 border border-slate-800/80 flex items-center justify-between text-[11px]">
                <span className="text-slate-400">Status Tren:</span>
                <span className="font-semibold text-slate-200 font-mono">
                  {generatedSignal.indicators.trend}
                </span>
              </div>

              {/* Level Eksekusi: Target Price & Stop Loss */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
                  <div className="text-[9px] text-emerald-400 uppercase font-sans font-semibold">
                    Target Price
                  </div>
                  <div className="text-emerald-300 font-bold text-xs mt-0.5">
                    ${generatedSignal.targetPrice}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                  <div className="text-[9px] text-rose-400 uppercase font-sans font-semibold">
                    Stop Loss
                  </div>
                  <div className="text-rose-300 font-bold text-xs mt-0.5">
                    ${generatedSignal.stopLoss}
                  </div>
                </div>
              </div>

              {/* Level Kunci: Support & Resistance Terverifikasi */}
              <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">
                    Support Kunci
                  </div>
                  <div className="text-emerald-400 font-bold mt-0.5">
                    ${generatedSignal.indicators.support || technical.s1}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                  <div className="text-[9px] text-slate-400 uppercase font-sans">
                    Resistance Kunci
                  </div>
                  <div className="text-rose-400 font-bold mt-0.5">
                    ${generatedSignal.indicators.resistance || technical.r1}
                  </div>
                </div>
              </div>

              {/* Matriks Tren Pasar Multi-Timeframe Langsung di Sinyal */}
              <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between text-[9px] text-slate-400 uppercase font-sans">
                  <span>Matriks Tren Pasar (Multi-TF)</span>
                  <span className="text-slate-500 font-mono">15m • 1h • 4h • 1d</span>
                </div>
                <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
                  {tfMatrix.map((item) => (
                    <div key={item.timeframe} className="p-1 rounded bg-slate-900/80 border border-slate-800">
                      <div className="text-[9px] text-slate-400">{item.timeframe}</div>
                      <div
                        className={`font-bold text-[10px] ${
                          item.trend === 'BULLISH'
                            ? 'text-emerald-400'
                            : item.trend === 'BEARISH'
                            ? 'text-rose-400'
                            : 'text-amber-400'
                        }`}
                      >
                        {item.trend === 'BULLISH' ? 'BUY' : item.trend === 'BEARISH' ? 'SELL' : 'NEU'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Alasan Ringkas AI (Reasoning Box) */}
              <div className="p-2.5 rounded-lg bg-[#070A12] border border-[#00F0FF]/25 space-y-1">
                <div className="text-[10px] text-[#00F0FF] uppercase tracking-wider font-bold flex items-center gap-1">
                  <Bot className="w-3 h-3 text-[#00F0FF]" />
                  Alasan Ringkas AI:
                </div>
                <p className="text-slate-200 text-[11px] leading-relaxed">
                  {generatedSignal.reason}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleGenerateAISignal}
                  className="flex-1 py-2 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all glow-cyan-sm"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Analisis Ulang</span>
                </button>

                {onOpenJournal && (
                  <button
                    onClick={() => {
                      if (onOpenJournalWithSignal && generatedSignal) {
                        onOpenJournalWithSignal(generatedSignal);
                      } else {
                        onOpenJournal();
                      }
                    }}
                    className="flex-1 py-2 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all glow-emerald-sm"
                    title="Simulasikan dan Catat ke Jurnal Trading"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Catat Jurnal</span>
                  </button>
                )}

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `AI Signal (${generatedSignal.symbol}): ${generatedSignal.signal} | Target: $${generatedSignal.targetPrice} | SL: $${generatedSignal.stopLoss} | ${generatedSignal.reason}`
                    );
                    setSignalCopied(true);
                    setTimeout(() => setSignalCopied(false), 2000);
                  }}
                  className="p-2 rounded-lg bg-[#0F1524] hover:bg-slate-800 text-slate-300 border border-slate-800 transition-colors"
                  title="Salin Sinyal"
                >
                  {signalCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          ) : (
            /* Kartu Tampilan Awal Sebelum Generate */
            <div className="p-4 rounded-xl bg-gradient-to-br from-[#0B101D] to-[#0E1528] border border-slate-800 text-center space-y-3">
              <div className="mx-auto w-12 h-12 rounded-full bg-[#00F0FF]/10 border border-[#00F0FF]/30 flex items-center justify-center text-[#00F0FF] glow-cyan-sm">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-white text-sm">AI Technical Signal Ready</h4>
                <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                  Klik tombol di atas untuk menganalisis {selectedInstrument.symbol} menggunakan algoritma kuantitatif RSI (14) dan Moving Average (EMA 20/50).
                </p>
              </div>
              <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-left font-mono text-[10px] space-y-1">
                <div className="text-slate-400 uppercase font-sans font-semibold text-[9px]">Instrumen Aktif:</div>
                <div className="flex justify-between text-slate-200">
                  <span>{selectedInstrument.symbol}</span>
                  <span className="text-[#00F0FF]">${selectedInstrument.price}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Koneksi Engine:</span>
                  <span className="text-emerald-400 font-bold">Siap (Endpoint /api/ai-signal)</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: SIGNAL SCANNER (ALL PAIRS) */}
      {/* ======================================================== */}
      {activeTab === 'signals' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
          {/* Filter Pills */}
          <div className="flex items-center gap-1 p-2 bg-[#0A0E1A]/60 border-b border-slate-800/60 overflow-x-auto text-[10px] font-mono">
            <Filter className="w-3 h-3 text-slate-500 shrink-0 ml-1 mr-0.5" />
            {(['all', 'crypto', 'forex', 'bullish', 'bearish'] as const).map((filter) => (
              <button
                key={filter}
                onClick={() => setSignalFilter(filter)}
                className={`px-2 py-0.5 rounded capitalize whitespace-nowrap transition-colors ${
                  signalFilter === filter
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 bg-slate-900 border border-slate-800'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Signals List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {filteredSignals.map((sig) => {
              const isSelected = selectedInstrument.symbol === sig.symbol;
              const isBull = sig.direction === 'BULLISH';

              return (
                <div
                  key={sig.id}
                  onClick={() => {
                    const found = instruments.find((i) => i.symbol === sig.symbol);
                    if (found) onSelectInstrument(found);
                  }}
                  className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-slate-850 border-blue-500/50 shadow-lg shadow-blue-500/5'
                      : 'bg-[#0B0F1C] border-slate-800/80 hover:border-slate-700 hover:bg-[#0E1324]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-white text-xs">{sig.symbol}</span>
                      <span className="text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {sig.timeframe}
                      </span>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                        isBull
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {isBull ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      {sig.direction}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-300 font-medium leading-tight">
                    {sig.setup}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/30 p-1.5 rounded">
                    <div>
                      <span className="text-slate-500">Target:</span>{' '}
                      <span className="text-emerald-400 font-semibold">${sig.targetPrice}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Invalidasi:</span>{' '}
                      <span className="text-rose-400 font-semibold">${sig.invalidationPrice}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: TEKNIKAL OVERVIEW */}
      {/* ======================================================== */}
      {activeTab === 'technical' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Bias Score Card */}
          <div className="p-3 bg-[#0B0F1C] border border-slate-800 rounded-lg space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Technical Bias (1h)</span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded font-mono ${
                  technical.bias === 'BULLISH'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : technical.bias === 'BEARISH'
                    ? 'bg-rose-500/20 text-rose-400'
                    : 'bg-slate-800 text-slate-300'
                }`}
              >
                {technical.bias} ({technical.score}%)
              </span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  technical.bias === 'BULLISH'
                    ? 'bg-emerald-500'
                    : technical.bias === 'BEARISH'
                    ? 'bg-rose-500'
                    : 'bg-amber-500'
                }`}
                style={{ width: `${technical.score}%` }}
              />
            </div>
          </div>

          {/* Indicators Overview */}
          <div className="grid grid-cols-2 gap-2">
            <div className="p-2.5 bg-[#0B0F1C] border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-400">RSI (14)</div>
              <div className="text-sm font-bold font-mono text-white mt-0.5">{technical.rsi14}</div>
              <div
                className={`text-[9px] font-mono mt-1 ${
                  technical.rsiStatus === 'OVERSOLD'
                    ? 'text-emerald-400'
                    : technical.rsiStatus === 'OVERBOUGHT'
                    ? 'text-rose-400'
                    : 'text-slate-400'
                }`}
              >
                {technical.rsiStatus}
              </div>
            </div>

            <div className="p-2.5 bg-[#0B0F1C] border border-slate-800 rounded-lg">
              <div className="text-[10px] text-slate-400">EMA Trend (20/50)</div>
              <div className="text-xs font-bold font-mono text-emerald-400 mt-1">{technical.emaTrend}</div>
              <div className="text-[9px] text-slate-400 font-mono mt-1">Ribbon Expansion</div>
            </div>
          </div>

          {/* Pivot Points Level Table */}
          <div className="p-3 bg-[#0B0F1C] border border-slate-800 rounded-lg space-y-2">
            <span className="text-[11px] font-semibold text-slate-300 block">Level Pivot Point Harian</span>
            <div className="space-y-1 font-mono text-[10px]">
              <div className="flex justify-between px-2 py-0.5 text-rose-400">
                <span>Resistance 2 (R2)</span>
                <span className="font-semibold">${technical.r2}</span>
              </div>
              <div className="flex justify-between px-2 py-0.5 text-rose-400/80">
                <span>Resistance 1 (R1)</span>
                <span>${technical.r1}</span>
              </div>
              <div className="flex justify-between px-2 py-1 bg-slate-800/50 rounded text-blue-400 font-bold border border-slate-700/60">
                <span>Pivot Point (P)</span>
                <span>${technical.pivot}</span>
              </div>
              <div className="flex justify-between px-2 py-0.5 text-emerald-400/80">
                <span>Support 1 (S1)</span>
                <span>${technical.s1}</span>
              </div>
              <div className="flex justify-between px-2 py-0.5 text-emerald-400">
                <span>Support 2 (S2)</span>
                <span className="font-semibold">${technical.s2}</span>
              </div>
            </div>
          </div>

          {/* 24h Price Range Visualizer */}
          <div className="p-3 bg-[#0B0F1C] border border-slate-800 rounded-lg space-y-2">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-slate-400">Rentang 24 Jam</span>
              <span className="text-slate-200">{currentRangePosition}% dari dasar</span>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full relative overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 via-blue-500 to-rose-500"
                style={{ width: `${currentRangePosition}%` }}
              />
            </div>
            <div className="flex justify-between text-[10px] font-mono text-slate-500">
              <span>Low: ${selectedInstrument.low24h}</span>
              <span>High: ${selectedInstrument.high24h}</span>
            </div>
          </div>

          {/* Multi-Timeframe Trend Matrix */}
          <div className="p-3 bg-[#0B0F1C] border border-slate-800 rounded-lg space-y-2">
            <span className="text-[11px] font-semibold text-slate-300 block">Matrix Tren Multi-Timeframe</span>
            <div className="grid grid-cols-4 gap-1 text-[10px] font-mono text-center">
              {tfMatrix.map((item) => (
                <div key={item.timeframe} className="p-1.5 rounded bg-black/40 border border-slate-800">
                  <div className="text-slate-400">{item.timeframe}</div>
                  <div className={`font-bold mt-0.5 ${
                    item.trend === 'BULLISH' ? 'text-emerald-400' : item.trend === 'BEARISH' ? 'text-rose-400' : 'text-amber-400'
                  }`}>
                    {item.trend}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 4: MARKET SCREENER */}
      {/* ======================================================== */}
      {activeTab === 'market' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          <div className="text-[11px] text-slate-400 mb-1 px-1">
            Ringkasan seluruh instrumen pantauan. Klik untuk membuka analisa.
          </div>

          {instruments.map((inst) => {
            const isSelected = inst.id === selectedInstrument.id;
            const isUp = inst.change24h >= 0;

            return (
              <div
                key={inst.id}
                onClick={() => onSelectInstrument(inst)}
                className={`p-2.5 rounded-lg border transition-all cursor-pointer flex items-center justify-between ${
                  isSelected
                    ? 'bg-slate-800/90 border-blue-500/60'
                    : 'bg-[#0B0F1C] border-slate-800 hover:border-slate-700 hover:bg-[#0E1324]'
                }`}
              >
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-white">
                    <span>{inst.symbol}</span>
                    <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800 text-slate-400">
                      {inst.type}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400">{inst.name}</span>
                </div>

                <div className="text-right font-mono">
                  <div className="font-semibold text-slate-100">
                    ${inst.decimals > 2 ? inst.price.toFixed(inst.decimals) : inst.price.toLocaleString('en-US')}
                  </div>
                  <span
                    className={`text-[10px] font-bold px-1 py-0.2 rounded ${
                      isUp ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {isUp ? '+' : ''}
                    {inst.change24h}%
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </aside>
  );
};
