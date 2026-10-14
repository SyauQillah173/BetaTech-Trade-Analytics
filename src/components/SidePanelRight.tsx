'use client';

import React, { useState } from 'react';
import { 
  Calculator, 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  ShieldCheck, 
  AlertTriangle, 
  Check, 
  Copy, 
  ArrowRight, 
  Zap, 
  Target, 
  Compass, 
  Flame,
  RefreshCw,
  Settings,
  Key,
  Bot,
  Activity,
  X,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { formatQuote } from '../lib/format';
import { Instrument, AISignal, Position, GeneratedAISignal } from '../types/market';
import { AI_SIGNALS_DATA } from '../data/mockData';

interface SidePanelRightProps {
  selectedInstrument: Instrument;
  onOpenSimulatedPosition: (position: Position) => void;
}

export const SidePanelRight: React.FC<SidePanelRightProps> = ({
  selectedInstrument,
  onOpenSimulatedPosition,
}) => {
  const [activeTab, setActiveTab] = useState<'calculator' | 'ai-signals' | 'sentiment'>('calculator');

  // --- RISK CALCULATOR STATE ---
  const [accountBalance, setAccountBalance] = useState<number>(100000);
  const [riskPercent, setRiskPercent] = useState<number>(1.5);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState<number>(selectedInstrument.price);
  const [stopLossPrice, setStopLossPrice] = useState<number>(
    parseFloat((selectedInstrument.price * (direction === 'LONG' ? 0.985 : 1.015)).toFixed(selectedInstrument.decimals))
  );
  const [takeProfitPrice, setTakeProfitPrice] = useState<number>(
    parseFloat((selectedInstrument.price * (direction === 'LONG' ? 1.045 : 0.955)).toFixed(selectedInstrument.decimals))
  );
  const [copied, setCopied] = useState(false);
  const [orderExecutedAlert, setOrderExecutedAlert] = useState(false);

  // --- AI SIGNAL GENERATOR STATE ---
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [generatedSignal, setGeneratedSignal] = useState<GeneratedAISignal | null>(null);
  const [aiProvider, setAiProvider] = useState<'gemini' | 'openai'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('betatech_ai_provider');
      if (saved === 'openai' || saved === 'gemini') return saved;
    }
    return 'gemini';
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

  // Save API key to localStorage
  const handleSaveApiSettings = () => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('betatech_ai_key', customApiKey.trim());
      localStorage.setItem('betatech_ai_provider', aiProvider);
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
          timeframe: '1h',
          currentPrice: selectedInstrument.price,
          apiKey: customApiKey.trim() || undefined,
          provider: aiProvider,
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

  // Calculations for Risk Calculator
  const riskAmountDollars = (accountBalance * riskPercent) / 100;
  const slDistance = Math.abs(entryPrice - stopLossPrice);
  const slDistancePct = entryPrice > 0 ? (slDistance / entryPrice) * 100 : 0;
  
  const tpDistance = Math.abs(takeProfitPrice - entryPrice);
  const tpDistancePct = entryPrice > 0 ? (tpDistance / entryPrice) * 100 : 0;

  // Units & Position size
  const positionUnits = slDistance > 0 ? riskAmountDollars / slDistance : 0;
  const positionSizeDollars = positionUnits * entryPrice;
  const rewardAmountDollars = positionUnits * tpDistance;
  const riskRewardRatio = slDistance > 0 ? tpDistance / slDistance : 0;

  // Quick Preset Handlers
  const handleSetRisk = (pct: number) => setRiskPercent(pct);
  const handleQuickSL = (pct: number) => {
    const factor = direction === 'LONG' ? 1 - pct / 100 : 1 + pct / 100;
    setStopLossPrice(parseFloat((entryPrice * factor).toFixed(selectedInstrument.decimals)));
  };
  const handleQuickRR = (multiplier: number) => {
    const dist = Math.abs(entryPrice - stopLossPrice);
    const tp = direction === 'LONG' ? entryPrice + dist * multiplier : entryPrice - dist * multiplier;
    setTakeProfitPrice(parseFloat(tp.toFixed(selectedInstrument.decimals)));
  };

  // Find active preset AI signal for the current instrument or fallback to first
  const currentPresetAISignal = AI_SIGNALS_DATA.find(s => s.symbol === selectedInstrument.symbol) || AI_SIGNALS_DATA[0];

  // Apply Preset AI Signal Parameters to Risk Calculator
  const handleApplyPresetAISignal = (sig: AISignal) => {
    setDirection(sig.action.includes('BUY') ? 'LONG' : 'SHORT');
    setEntryPrice(sig.entryPrice);
    setStopLossPrice(sig.stopLoss);
    setTakeProfitPrice(sig.target1);
    setActiveTab('calculator');
  };

  // Apply Live Generated AI Signal to Risk Calculator
  const handleApplyGeneratedSignal = (sig: GeneratedAISignal) => {
    setDirection(sig.signal === 'SELL' ? 'SHORT' : 'LONG');
    setEntryPrice(sig.currentPrice || selectedInstrument.price);
    setStopLossPrice(sig.stopLoss);
    setTakeProfitPrice(sig.targetPrice);
    setActiveTab('calculator');
  };

  // Execute Simulated Order
  const handleExecuteSimulatedOrder = () => {
    const newPos: Position = {
      id: `pos-${Date.now()}`,
      symbol: selectedInstrument.symbol,
      side: direction,
      size: parseFloat(positionSizeDollars.toFixed(2)),
      entryPrice,
      currentPrice: selectedInstrument.price,
      pnl: 0,
      pnlPct: 0,
      stopLoss: stopLossPrice,
      takeProfit: takeProfitPrice,
      timestamp: new Date().toLocaleTimeString(),
    };

    onOpenSimulatedPosition(newPos);
    setOrderExecutedAlert(true);
    setTimeout(() => setOrderExecutedAlert(false), 3500);
  };

  return (
    <aside className="w-full md:w-80 lg:w-96 flex flex-col bg-[#080C16]/95 border-l border-slate-800/80 shrink-0 h-full overflow-hidden">
      {/* Tab Switcher Header */}
      <div className="p-2 border-b border-slate-800/80 bg-[#090E1B]">
        <div className="flex items-center p-1 rounded-xl bg-[#060912] border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('calculator')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'calculator'
                ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 glow-cyan-sm shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            <span>Risk Calc</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-signals')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'ai-signals'
                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 glow-emerald-sm shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span>AI Signals</span>
          </button>

          <button
            onClick={() => setActiveTab('sentiment')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'sentiment'
                ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30 shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Sentimen</span>
          </button>
        </div>
      </div>

      {/* Main Tab Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* ======================================================== */}
        {/* TAB 1: RISK MANAGEMENT CALCULATOR */}
        {/* ======================================================== */}
        {activeTab === 'calculator' && (
          <div className="space-y-3.5 text-xs">
            {/* Notification alert on simulated order */}
            {orderExecutedAlert && (
              <div className="p-2.5 rounded-lg bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 flex items-center gap-2 glow-emerald-sm animate-in fade-in slide-in-from-top-1">
                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Posisi simulasi berhasil ditempatkan ke Terminal!</span>
              </div>
            )}

            {/* Account Balance Card */}
            <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold text-slate-300">Saldo Akun (USD)</span>
                <span className="text-[10px] font-mono text-emerald-400">Simulasi Pro</span>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">$</span>
                <input
                  type="number"
                  value={accountBalance}
                  onChange={(e) => setAccountBalance(Math.max(1, parseFloat(e.target.value) || 0))}
                  className="w-full pl-7 pr-3 py-1.5 bg-[#070A12] text-sm font-mono font-bold text-white rounded-lg border border-slate-700/80 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {[10000, 25000, 50000, 100000].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setAccountBalance(preset)}
                    className={`flex-1 py-1 rounded text-[10px] font-mono border transition-colors ${
                      accountBalance === preset
                        ? 'bg-[#00F0FF]/15 text-[#00F0FF] border-[#00F0FF]/40'
                        : 'bg-[#090D18] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    ${preset / 1000}k
                  </button>
                ))}
              </div>
            </div>

            {/* Risk % Per Trade Slider & Presets */}
            <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-300">Toleransi Risiko per Transaksi</span>
                <div className="flex items-center gap-1">
                  <span className="font-mono font-bold text-[#00F0FF] text-sm">{riskPercent}%</span>
                  <span className="text-slate-500 font-mono text-[11px]">
                    (${riskAmountDollars.toLocaleString()})
                  </span>
                </div>
              </div>

              <input
                type="range"
                min="0.5"
                max="5.0"
                step="0.25"
                value={riskPercent}
                onChange={(e) => setRiskPercent(parseFloat(e.target.value))}
                className="w-full accent-[#00F0FF] cursor-pointer"
              />

              <div className="flex items-center gap-1.5">
                {[0.5, 1.0, 1.5, 2.0, 3.0].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleSetRisk(pct)}
                    className={`flex-1 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                      riskPercent === pct
                        ? 'bg-[#00F0FF]/20 text-[#00F0FF] border-[#00F0FF]/40 font-bold'
                        : 'bg-[#090D18] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>

              {/* Safe Rule Indicator */}
              <div className="flex items-center gap-1.5 text-[10px] pt-1">
                {riskPercent <= 2 ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" />
                    Aturan Aman (Konservatif ≤ 2%)
                  </span>
                ) : (
                  <span className="text-amber-400 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Risiko Agresif ({riskPercent}% &gt; 2%)
                  </span>
                )}
              </div>
            </div>

            {/* Trade Direction Selector (Long vs Short) */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setDirection('LONG')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                  direction === 'LONG'
                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 glow-emerald-sm'
                    : 'bg-[#0D1322] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <TrendingUp className="w-4 h-4" />
                <span>BUY / LONG</span>
              </button>
              <button
                onClick={() => setDirection('SHORT')}
                className={`py-2 px-3 rounded-xl font-bold flex items-center justify-center gap-2 border transition-all ${
                  direction === 'SHORT'
                    ? 'bg-rose-500/20 text-rose-400 border-rose-500/40 glow-rose'
                    : 'bg-[#0D1322] text-slate-400 border-slate-800 hover:text-white'
                }`}
              >
                <TrendingDown className="w-4 h-4" />
                <span>SELL / SHORT</span>
              </button>
            </div>

            {/* Entry, Stop Loss & Take Profit Levels */}
            <div className="p-3 rounded-xl bg-[#0D1322] border border-slate-800/80 space-y-3">
              {/* Entry Price */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span>Harga Masuk (Entry)</span>
                  <button
                    onClick={() => setEntryPrice(selectedInstrument.price)}
                    className="text-[10px] text-[#00F0FF] hover:underline"
                  >
                    Gunakan Harga Pasar
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={entryPrice}
                  onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#070A12] text-xs font-mono font-semibold text-white rounded-lg border border-slate-700/80 focus:outline-none focus:border-[#00F0FF]"
                />
              </div>

              {/* Stop Loss */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-rose-400 font-medium">Stop Loss (SL)</span>
                  <span className="text-[10px] font-mono text-rose-400">
                    Jarak: {slDistancePct.toFixed(2)}%
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={stopLossPrice}
                  onChange={(e) => setStopLossPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#070A12] text-xs font-mono font-semibold text-rose-300 rounded-lg border border-rose-500/40 focus:outline-none focus:border-rose-400"
                />
                <div className="flex items-center gap-1 mt-1">
                  {[1, 1.5, 2, 3].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => handleQuickSL(pct)}
                      className="flex-1 py-0.5 rounded text-[10px] font-mono bg-[#090D18] text-slate-400 hover:text-rose-300 border border-slate-800"
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Take Profit */}
              <div>
                <div className="flex items-center justify-between text-slate-400 mb-1">
                  <span className="text-emerald-400 font-medium">Take Profit (TP)</span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    Target: +{tpDistancePct.toFixed(2)}%
                  </span>
                </div>
                <input
                  type="number"
                  step="any"
                  value={takeProfitPrice}
                  onChange={(e) => setTakeProfitPrice(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 bg-[#070A12] text-xs font-mono font-semibold text-emerald-300 rounded-lg border border-emerald-500/40 focus:outline-none focus:border-emerald-400"
                />
                <div className="flex items-center gap-1 mt-1">
                  {[1.5, 2, 2.5, 3].map((rr) => (
                    <button
                      key={rr}
                      onClick={() => handleQuickRR(rr)}
                      className="flex-1 py-0.5 rounded text-[10px] font-mono bg-[#090D18] text-slate-400 hover:text-emerald-300 border border-slate-800"
                    >
                      1:{rr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Calculated Results Summary Box */}
            <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0F1626] to-[#0A0F1D] border border-[#00F0FF]/30 glow-cyan-sm space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-white flex items-center gap-1.5">
                  <Target className="w-3.5 h-3.5 text-[#00F0FF]" />
                  Hasil Kalkulasi Posisi
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#00F0FF]/20 text-[#00F0FF] font-bold">
                  R:R 1 : {riskRewardRatio.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <div className="text-[10px] text-slate-400">Ukuran Posisi ($)</div>
                  <div className="text-sm font-bold text-white">
                    ${positionSizeDollars.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Unit / Kontrak</div>
                  <div className="text-sm font-bold text-[#00F0FF]">
                    {positionUnits.toFixed(selectedInstrument.decimals > 2 ? 2 : 4)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Maksimal Rugi (Risk)</div>
                  <div className="text-xs font-semibold text-rose-400">
                    -${riskAmountDollars.toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] text-slate-400">Estimasi Untung (Reward)</div>
                  <div className="text-xs font-semibold text-emerald-400">
                    +${rewardAmountDollars.toFixed(2)}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <button
                onClick={handleExecuteSimulatedOrder}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-[#10B981] hover:opacity-95 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-cyan transition-transform active:scale-98"
              >
                <Zap className="w-4 h-4 fill-black" />
                <span>Eksekusi Simulasi Order Sekarang</span>
              </button>

              <button
                onClick={() => {
                  navigator.clipboard.writeText(
                    `BetaTech Trade: ${direction} ${selectedInstrument.symbol} | Entry: ${formatQuote(entryPrice, selectedInstrument.decimals, selectedInstrument.type)} | SL: ${formatQuote(stopLossPrice, selectedInstrument.decimals, selectedInstrument.type)} | TP: ${formatQuote(takeProfitPrice, selectedInstrument.decimals, selectedInstrument.type)} | R:R 1:${riskRewardRatio.toFixed(2)}`
                  );
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full py-2 rounded-lg bg-[#0F1524] hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs flex items-center justify-center gap-1.5 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin ke Clipboard!' : 'Salin Parameter Trade'}</span>
              </button>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: AI SIGNAL GENERATOR (WIDGET DENGAN API ROUTE) */}
        {/* ======================================================== */}
        {activeTab === 'ai-signals' && (
          <div className="space-y-3 text-xs">
            {/* Header Control & API Settings Toggle */}
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
                  <div className="flex gap-1.5 p-1 bg-black/50 rounded-lg border border-slate-800 text-[10px]">
                    <button
                      onClick={() => setAiProvider('gemini')}
                      className={`flex-1 py-1 rounded font-semibold transition-all ${
                        aiProvider === 'gemini'
                          ? 'bg-[#00F0FF]/20 text-[#00F0FF] border border-[#00F0FF]/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Gemini 2.0 Flash
                    </button>
                    <button
                      onClick={() => setAiProvider('openai')}
                      className={`flex-1 py-1 rounded font-semibold transition-all ${
                        aiProvider === 'openai'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      OpenAI GPT-4o
                    </button>
                  </div>

                  {/* API Key Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] text-slate-400 block font-mono">
                      {aiProvider === 'gemini' ? 'Gemini API Key' : 'OpenAI API Key'} (Opsional)
                    </label>
                    <input
                      type="password"
                      value={customApiKey}
                      onChange={(e) => setCustomApiKey(e.target.value)}
                      placeholder={aiProvider === 'gemini' ? 'AIzaSy...' : 'sk-...'}
                      className="w-full px-2.5 py-1.5 bg-black/60 text-xs font-mono text-white rounded border border-slate-700 focus:outline-none focus:border-[#00F0FF]"
                    />
                    <p className="text-[9px] text-slate-500 leading-tight">
                      *Jika dikosongkan, widget otomatis menggunakan Quant Algorithmic Engine internal tanpa error.
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

              {/* Generate AI Trigger Button */}
              <button
                onClick={handleGenerateAISignal}
                disabled={isAnalyzing}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] via-[#00F0FF]/90 to-[#10B981] hover:opacity-95 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-cyan transition-all shadow-md active:scale-98 disabled:opacity-50"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-black" />
                    <span>Menganalisis RSI, MA & Candlestick...</span>
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
            {/* KARTU SINYAL MENARIK (HASIL DARI API ROUTE) */}
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
                      Confidence Score
                    </span>
                    <span className="font-mono font-bold text-[#00F0FF] text-xs">
                      {generatedSignal.confidence}% Keyakinan
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

                {/* Indikator Snapshot (RSI & Moving Average) */}
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
                        {generatedSignal.indicators.rsi < 35 ? 'Oversold' : generatedSignal.indicators.rsi > 65 ? 'Overbought' : 'Netral'}
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
                      {formatQuote(generatedSignal.targetPrice, selectedInstrument.decimals, selectedInstrument.type)}
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <div className="text-[9px] text-rose-400 uppercase font-sans font-semibold">
                      Stop Loss
                    </div>
                    <div className="text-rose-300 font-bold text-xs mt-0.5">
                      {formatQuote(generatedSignal.stopLoss, selectedInstrument.decimals, selectedInstrument.type)}
                    </div>
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

                {/* Tombol Terapkan ke Kalkulator Risiko */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => handleApplyGeneratedSignal(generatedSignal)}
                    className="flex-1 py-2 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all glow-cyan-sm"
                  >
                    <span>Terapkan ke Kalkulator Risiko</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `AI Signal (${generatedSignal.symbol}): ${generatedSignal.signal} | Target: ${formatQuote(generatedSignal.targetPrice, selectedInstrument.decimals, selectedInstrument.type)} | SL: ${formatQuote(generatedSignal.stopLoss, selectedInstrument.decimals, selectedInstrument.type)} | ${generatedSignal.reason}`
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
              /* Kartu Default Sebelum Generate */
              <div className="p-3.5 rounded-xl bg-gradient-to-br from-[#0B101D] to-[#0E1528] border border-[#00F0FF]/30 glow-cyan-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-white">{currentPresetAISignal.symbol}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                      {currentPresetAISignal.timeframe}
                    </span>
                  </div>
                  <span
                    className={`text-xs font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                      currentPresetAISignal.action.includes('BUY')
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 glow-emerald-sm'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/40 glow-rose'
                    }`}
                  >
                    <Flame className="w-3.5 h-3.5" />
                    {currentPresetAISignal.action}
                  </span>
                </div>

                {/* Confidence Meter */}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="text-slate-400">Tingkat Keyakinan AI</span>
                    <span className="font-mono font-bold text-[#00F0FF]">{currentPresetAISignal.confidence}% Bullish</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-[#00F0FF] rounded-full transition-all duration-500"
                      style={{ width: `${currentPresetAISignal.confidence}%` }}
                    />
                  </div>
                </div>

                {/* Detected Pattern */}
                <div className="p-2 rounded-lg bg-black/40 border border-slate-800 space-y-1">
                  <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                    Pola Teknikal Terdeteksi
                  </div>
                  <div className="text-slate-200 font-medium text-[11px]">
                    {currentPresetAISignal.pattern}
                  </div>
                </div>

                {/* Targets & Invalidation Grid */}
                <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <div className="text-[9px] text-slate-400 uppercase">Zona Masuk</div>
                    <div className="text-white font-bold">{currentPresetAISignal.entryZone}</div>
                  </div>
                  <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                    <div className="text-[9px] text-slate-400 uppercase">Rasio R:R</div>
                    <div className="text-[#00F0FF] font-bold">{currentPresetAISignal.rrRatio}</div>
                  </div>
                  <div className="p-2 rounded bg-emerald-500/10 border border-emerald-500/30">
                    <div className="text-[9px] text-emerald-400 uppercase">Target 1</div>
                    <div className="text-emerald-300 font-bold">{formatQuote(currentPresetAISignal.target1, selectedInstrument.decimals, selectedInstrument.type)}</div>
                  </div>
                  <div className="p-2 rounded bg-rose-500/10 border border-rose-500/30">
                    <div className="text-[9px] text-rose-400 uppercase">Stop Loss</div>
                    <div className="text-rose-300 font-bold">{formatQuote(currentPresetAISignal.stopLoss, selectedInstrument.decimals, selectedInstrument.type)}</div>
                  </div>
                </div>

                {/* Apply Setup to Calculator Button */}
                <button
                  onClick={() => handleApplyPresetAISignal(currentPresetAISignal)}
                  className="w-full py-2 rounded-lg bg-[#00F0FF]/15 hover:bg-[#00F0FF]/25 text-[#00F0FF] border border-[#00F0FF]/40 font-bold text-xs flex items-center justify-center gap-2 transition-all"
                >
                  <span>Terapkan Setup ke Kalkulator Risiko</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Signal Stream Feed Terintegrasi */}
            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                <span>Feed Sinyal Terbaru</span>
                <span className="text-[#00F0FF] text-[10px] font-mono">Live Stream</span>
              </div>

              {AI_SIGNALS_DATA.map((sig) => (
                <div
                  key={sig.id}
                  onClick={() => handleApplyPresetAISignal(sig)}
                  className="p-2.5 rounded-lg bg-[#0D1322] border border-slate-800 hover:border-slate-700 cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{sig.symbol}</span>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        sig.action.includes('BUY')
                          ? 'text-emerald-400 bg-emerald-500/15'
                          : 'text-rose-400 bg-rose-500/15'
                      }`}
                    >
                      {sig.action} ({sig.confidence}%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>{sig.pattern.slice(0, 28)}...</span>
                    <span>{sig.timestamp}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: MARKET PULSE & SENTIMENT */}
        {/* ======================================================== */}
        {activeTab === 'sentiment' && (
          <div className="space-y-3 text-xs">
            {/* Fear & Greed Gauge Card */}
            <div className="p-3.5 rounded-xl bg-[#0D1424] border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-white">Fear & Greed Index</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  74 - Greed
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden relative">
                <div className="h-full w-full bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400 opacity-80" />
                <div className="absolute top-0 bottom-0 left-[74%] w-1.5 bg-white shadow-[0_0_8px_#ffffff]" />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500">
                <span>0 (Extreme Fear)</span>
                <span>50 (Netral)</span>
                <span>100 (Extreme Greed)</span>
              </div>
            </div>

            {/* Long vs Short Liquidation Ratio */}
            <div className="p-3.5 rounded-xl bg-[#0D1424] border border-slate-800 space-y-2">
              <span className="font-bold text-white">Rasio Long vs Short (24h)</span>
              <div className="flex items-center gap-1 font-mono text-[11px] font-bold">
                <span className="text-emerald-400">Long 62.4%</span>
                <span className="text-slate-600">/</span>
                <span className="text-rose-400">Short 37.6%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-slate-800 flex overflow-hidden">
                <div className="bg-emerald-500 h-full" style={{ width: '62.4%' }} />
                <div className="bg-rose-500 h-full" style={{ width: '37.6%' }} />
              </div>
            </div>

            {/* Whale Net Inflow Tracking */}
            <div className="p-3.5 rounded-xl bg-[#0D1424] border border-slate-800 space-y-2">
              <span className="font-bold text-white">Arus Dana Institusional (Whales)</span>
              <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                <div className="p-2 rounded bg-black/40 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Net Inflow (24h)</div>
                  <div className="text-emerald-400 font-bold">+$142.8M</div>
                </div>
                <div className="p-2 rounded bg-black/40 border border-slate-800">
                  <div className="text-[10px] text-slate-400">Dominasi Spot</div>
                  <div className="text-[#00F0FF] font-bold">71.2%</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
