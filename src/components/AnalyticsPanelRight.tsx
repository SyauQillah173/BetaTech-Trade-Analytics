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
  BookOpen,
  ShieldCheck,
  Target
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
    <aside className="w-full lg:w-80 xl:w-96 h-full bg-[#090D18] border-l border-slate-800/80 flex flex-col overflow-y-auto lg:overflow-hidden text-xs pb-16 lg:pb-0">
      {/* Top Header & Tab Switcher */}
      <div className="p-3 bg-[#0B0F1C] border-b border-slate-800/80 flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white uppercase tracking-wider font-sans">
            Sinyal &amp; Analisis
          </span>
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
            SMC Engine
          </span>
        </div>

        {/* Tab Buttons (4 Clean Tabs) */}
        <div className="grid grid-cols-4 p-0.5 bg-[#070A12] rounded-lg border border-slate-800 text-xs font-medium">
          <button
            onClick={() => setActiveTab('ai-signal')}
            className={`py-1 rounded text-center transition-colors ${
              activeTab === 'ai-signal'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Sinyal
          </button>
          <button
            onClick={() => setActiveTab('signals')}
            className={`py-1 rounded text-center transition-colors ${
              activeTab === 'signals'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scanner
          </button>
          <button
            onClick={() => setActiveTab('technical')}
            className={`py-1 rounded text-center transition-colors ${
              activeTab === 'technical'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Teknikal
          </button>
          <button
            onClick={() => setActiveTab('market')}
            className={`py-1 rounded text-center transition-colors ${
              activeTab === 'market'
                ? 'bg-slate-800 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Screener
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: SIGNAL GENERATOR & EXECUTION */}
      {/* ======================================================== */}
      {activeTab === 'ai-signal' && (
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {/* Signal Controls Toolbar */}
          <div className="p-3 rounded-xl bg-[#0F1626] border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white text-xs">
                Generator Sinyal
              </span>
              
              {/* Settings Toggle Button */}
              <button
                onClick={() => setShowConfigDrawer(!showConfigDrawer)}
                className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors flex items-center gap-1 text-[11px]"
                title="Konfigurasi API Model"
              >
                <Settings className="w-3.5 h-3.5" />
                <span className="font-mono text-[10px] hidden sm:inline">Pengaturan</span>
              </button>
            </div>

            {/* API Configuration Drawer */}
            {showConfigDrawer && (
              <div className="p-3 rounded-lg bg-[#0B0F1C] border border-slate-800 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-white">
                  <span>Routing Engine</span>
                  <button onClick={() => setShowConfigDrawer(false)} className="text-slate-400 hover:text-white">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Provider Radio Tabs */}
                <div className="grid grid-cols-3 gap-1 p-0.5 bg-black/50 rounded border border-slate-800 text-[10px]">
                  <button
                    onClick={() => setAiProvider('auto')}
                    className={`py-1 rounded font-medium transition-colors ${
                      aiProvider === 'auto' || aiProvider === '9router'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Auto Quant
                  </button>
                  <button
                    onClick={() => setAiProvider('gemini')}
                    className={`py-1 rounded font-medium transition-colors ${
                      aiProvider === 'gemini'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Gemini
                  </button>
                  <button
                    onClick={() => setAiProvider('openai')}
                    className={`py-1 rounded font-medium transition-colors ${
                      aiProvider === 'openai'
                        ? 'bg-slate-800 text-white font-bold'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    OpenAI
                  </button>
                </div>

                {/* API Key Input */}
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-400 block font-mono">
                    API Key (Opsional)
                  </label>
                  <input
                    type="password"
                    value={customApiKey}
                    onChange={(e) => setCustomApiKey(e.target.value)}
                    placeholder="Dikosongkan untuk internal algo engine"
                    className="w-full px-2 py-1 bg-black/60 text-xs font-mono text-white rounded border border-slate-700 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <button
                  onClick={handleSaveApiSettings}
                  className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded transition-colors"
                >
                  Simpan
                </button>
              </div>
            )}

            {/* Timeframe Selector for Analysis */}
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-slate-400 text-[11px]">Timeframe:</span>
              <div className="flex gap-1">
                {(['15m', '1h', '4h', '1d'] as Timeframe[]).map((tf) => (
                  <button
                    key={tf}
                    onClick={() => {
                      setAiTimeframe(tf);
                      if (onTimeframeChange) onTimeframeChange(tf);
                    }}
                    className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                      aiTimeframe === tf
                        ? 'bg-slate-800 text-white font-bold border border-slate-700'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
            </div>

            {/* Clean Trigger Button */}
            <button
              onClick={handleGenerateAISignal}
              disabled={isAnalyzing}
              className="w-full py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-white" />
                  <span>Memindai Struktur Pasar...</span>
                </>
              ) : (
                <>
                  <Target className="w-3.5 h-3.5 text-white" />
                  <span>Scan Setup {selectedInstrument.symbol}</span>
                </>
              )}
            </button>
          </div>

          {/* ======================================================== */}
          {/* KARTU SINYAL INSTITUSIONAL (CLEAN, PRO TRADING CARD) */}
          {/* ======================================================== */}
          {generatedSignal ? (
            <div className="p-3.5 rounded-xl bg-[#0B0F1C] border border-slate-800 space-y-3 animate-in fade-in duration-200">
              {/* Header: Pair, Direction Badge & Time */}
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white font-sans">{generatedSignal.symbol}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                      {generatedSignal.timeframe}
                    </span>
                    {generatedSignal.riskRewardRatio && (
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-emerald-400">
                        1:{generatedSignal.riskRewardRatio} R:R
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono mt-0.5">
                    <span>{generatedSignal.analyzedAt}</span>
                    <span>•</span>
                    <span className="text-slate-300">{generatedSignal.provider}</span>
                  </div>
                </div>

                {/* Direction Badge */}
                <span
                  className={`text-xs font-bold px-2.5 py-1 rounded font-mono ${
                    generatedSignal.signal === 'BUY'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : generatedSignal.signal === 'SELL'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-slate-800 text-amber-300 border border-slate-700'
                  }`}
                >
                  {generatedSignal.signal === 'BUY' ? 'LONG (BUY)' : generatedSignal.signal === 'SELL' ? 'SHORT (SELL)' : 'WAIT / NEUTRAL'}
                </span>
              </div>

              {/* Primary Execution Levels: 2x2 Clean Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-sans">Harga Masuk (Entry)</span>
                  <span className="font-bold text-white text-sm mt-0.5 block">
                    ${generatedSignal.currentPrice}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                  <span className="text-[10px] text-emerald-400 block font-sans">Target (TP)</span>
                  <span className="font-bold text-emerald-300 text-sm mt-0.5 block">
                    ${generatedSignal.targetPrice}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-rose-500/5 border border-rose-500/20">
                  <span className="text-[10px] text-rose-400 block font-sans">Stop Loss (Anti-Hunt)</span>
                  <span className="font-bold text-rose-300 text-sm mt-0.5 block">
                    ${generatedSignal.stopLoss}
                  </span>
                </div>

                <div className="p-2 rounded-lg bg-black/40 border border-slate-800/80">
                  <span className="text-[10px] text-slate-400 block font-sans">Tingkat Keyakinan</span>
                  <span className="font-bold text-slate-200 text-sm mt-0.5 block">
                    {generatedSignal.confidence}%
                  </span>
                </div>
              </div>

              {/* SMC & ICT Intelligence Overview */}
              {generatedSignal.ict && (
                <div className="p-2.5 rounded-lg bg-black/30 border border-slate-800 text-xs font-mono space-y-1.5">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Setup Institusional:</span>
                    <span className="text-white font-medium">{generatedSignal.ict.setupName || 'ICT Protocol'}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Bias &amp; Model:</span>
                    <span className={generatedSignal.ict.dailyBias === 'BULLISH' ? 'text-emerald-400 font-medium' : generatedSignal.ict.dailyBias === 'BEARISH' ? 'text-rose-400 font-medium' : 'text-slate-300'}>
                      {generatedSignal.ict.dailyBias} ({generatedSignal.ict.biasModel})
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Pricing Array:</span>
                    <span className={generatedSignal.ict.zone === 'DISCOUNT' ? 'text-emerald-400' : generatedSignal.ict.zone === 'PREMIUM' ? 'text-rose-400' : 'text-slate-300'}>
                      {generatedSignal.ict.zone} ({generatedSignal.ict.discountPct}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-sans">Sesi Killzone:</span>
                    <span className="text-slate-300">{generatedSignal.ict.killzoneName}</span>
                  </div>
                </div>
              )}

              {/* Rationale Naratif */}
              <div className="p-2.5 rounded-lg bg-black/40 border border-slate-800/80 text-xs space-y-1">
                <span className="text-[10px] text-slate-400 font-medium uppercase block tracking-wider">
                  Analisis Eksekusi
                </span>
                <p className="text-slate-300 text-xs leading-relaxed font-sans">
                  {generatedSignal.reason}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 pt-1">
                {onOpenJournal && (
                  <button
                    onClick={() => {
                      if (onOpenJournalWithSignal && generatedSignal) {
                        onOpenJournalWithSignal(generatedSignal);
                      } else {
                        onOpenJournal();
                      }
                    }}
                    className="flex-1 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Catat ke Jurnal</span>
                  </button>
                )}

                <button
                  onClick={handleGenerateAISignal}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="Pindai Ulang Setup"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(
                      `Signal (${generatedSignal.symbol}): ${generatedSignal.signal} | Entry: $${generatedSignal.currentPrice} | TP: $${generatedSignal.targetPrice} | SL: $${generatedSignal.stopLoss}`
                    );
                    setSignalCopied(true);
                    setTimeout(() => setSignalCopied(false), 2000);
                  }}
                  className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  title="Salin Sinyal"
                >
                  {signalCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          ) : (
            /* Clean Empty State */
            <div className="p-4 rounded-xl bg-[#0B0F1C] border border-slate-800 text-center space-y-3">
              <div className="mx-auto w-10 h-10 rounded-lg bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-300">
                <Target className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <h4 className="font-semibold text-white text-xs">Siap Memindai Setup</h4>
                <p className="text-slate-400 text-[11px] mt-1 leading-relaxed">
                  Pindai struktur pasar {selectedInstrument.symbol} menggunakan konfluensi SMC &amp; ICT institusional (Killzone, OTE, dan Anti-SL Shield).
                </p>
              </div>
              <div className="p-2 rounded-lg bg-black/40 border border-slate-800 text-left font-mono text-[10px] space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Instrumen:</span>
                  <span className="text-white font-semibold">{selectedInstrument.symbol}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Harga:</span>
                  <span className="text-white">${selectedInstrument.price}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Bias Teknikal:</span>
                  <span className={technical.bias === 'BULLISH' ? 'text-emerald-400' : technical.bias === 'BEARISH' ? 'text-rose-400' : 'text-amber-400'}>
                    {technical.bias}
                  </span>
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

          {/* SMC & ICT Institutional Profile (Smart Money Concepts) */}
          <div className="p-3 bg-[#0B0F1C] border border-[#00F0FF]/30 rounded-lg space-y-2 font-mono text-[10px]">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 font-sans font-bold text-slate-200">
                <ShieldCheck className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>SMC & ICT Profile</span>
              </div>
              <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                technical.bias === 'BULLISH'
                  ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                  : technical.bias === 'BEARISH'
                  ? 'text-rose-400 bg-rose-500/10 border border-rose-500/30'
                  : 'text-amber-400 bg-amber-500/10 border border-amber-500/30'
              }`}>
                {technical.dailyBiasModel || technical.bias}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-black/40 p-2 rounded border border-slate-800/80">
                <div className="text-[9px] text-slate-400 uppercase font-sans">PDH (BSL / High 24h)</div>
                <div className="text-emerald-400 font-bold mt-0.5">${technical.pdh || selectedInstrument.high24h}</div>
              </div>
              <div className="bg-black/40 p-2 rounded border border-slate-800/80">
                <div className="text-[9px] text-slate-400 uppercase font-sans">PDL (SSL / Low 24h)</div>
                <div className="text-rose-400 font-bold mt-0.5">${technical.pdl || selectedInstrument.low24h}</div>
              </div>
            </div>

            <div className="bg-black/40 p-2 rounded border border-slate-800/80 space-y-1">
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 font-sans">Session / Killzone:</span>
                <span className="text-[#00F0FF] font-semibold">{technical.killzoneName || 'Global Market Session'}</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span className="text-slate-400 font-sans">Pricing Array:</span>
                <span className={`font-bold ${
                  technical.premiumDiscountZone === 'DISCOUNT'
                    ? 'text-emerald-400'
                    : technical.premiumDiscountZone === 'PREMIUM'
                    ? 'text-rose-400'
                    : 'text-amber-400'
                }`}>
                  {technical.premiumDiscountZone || 'EQUILIBRIUM'}
                </span>
              </div>
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
