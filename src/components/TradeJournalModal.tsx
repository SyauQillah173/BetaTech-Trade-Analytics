'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, 
  BookOpen, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  Trash2, 
  Sparkles, 
  Clock, 
  Target, 
  ShieldCheck, 
  Award,
  DollarSign,
  BarChart2,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';
import { Instrument, GeneratedAISignal } from '../types/market';
import { TradeJournalRecord } from '../lib/db';

interface TradeJournalModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedInstrument: Instrument;
  initialSignal?: GeneratedAISignal | null;
}

export const TradeJournalModal: React.FC<TradeJournalModalProps> = ({
  isOpen,
  onClose,
  selectedInstrument,
  initialSignal,
}) => {
  const [activeTab, setActiveTab] = useState<'list' | 'create'>('list');
  const [journals, setJournals] = useState<TradeJournalRecord[]>([]);
  const [stats, setStats] = useState({
    totalTrades: 0,
    closedTrades: 0,
    openTrades: 0,
    winRate: 0,
    totalPnL: 0,
    avgRiskRewardRatio: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [filterOutcome, setFilterOutcome] = useState<'ALL' | 'OPEN' | 'CLOSED' | 'WIN' | 'LOSS'>('ALL');

  // Form State
  const [symbol, setSymbol] = useState(selectedInstrument.symbol);
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [entryPrice, setEntryPrice] = useState(selectedInstrument.price);
  const [stopLoss, setStopLoss] = useState(
    parseFloat((selectedInstrument.price * 0.985).toFixed(selectedInstrument.decimals))
  );
  const [takeProfit, setTakeProfit] = useState(
    parseFloat((selectedInstrument.price * 1.045).toFixed(selectedInstrument.decimals))
  );
  const [positionSize, setPositionSize] = useState(25000);
  const [strategy, setStrategy] = useState('Wyckoff Spring + RSI Rebound');
  const [notes, setNotes] = useState('');
  const [aiSignalUsed, setAiSignalUsed] = useState(true);
  const [aiConfidence, setAiConfidence] = useState(88);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Close trade modal state
  const [closingTradeId, setClosingTradeId] = useState<string | null>(null);
  const [closingExitPrice, setClosingExitPrice] = useState<number>(selectedInstrument.price);
  const [closingNotes, setClosingNotes] = useState<string>('');

  // Fetch journals & stats from API
  const fetchJournals = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/trade-journal');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setJournals(json.data);
          if (json.stats) setStats(json.stats);
        }
      }
    } catch (err) {
      console.error('Error fetching trade journals:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchJournals();
      if (initialSignal) {
        setSymbol(initialSignal.symbol);
        setDirection(initialSignal.signal === 'SELL' ? 'SHORT' : 'LONG');
        setEntryPrice(initialSignal.currentPrice || selectedInstrument.price);
        setStopLoss(initialSignal.stopLoss);
        setTakeProfit(initialSignal.targetPrice);
        setAiSignalUsed(true);
        setAiConfidence(initialSignal.confidence);
        setNotes(`AI ${initialSignal.provider.toUpperCase()} Signal: ${initialSignal.reason}`);
        setStrategy('AI RSI & Moving Average Divergence');
        setActiveTab('create');
      } else {
        setSymbol(selectedInstrument.symbol);
        setEntryPrice(selectedInstrument.price);
        setStopLoss(
          parseFloat((selectedInstrument.price * (direction === 'LONG' ? 0.985 : 1.015)).toFixed(selectedInstrument.decimals))
        );
        setTakeProfit(
          parseFloat((selectedInstrument.price * (direction === 'LONG' ? 1.045 : 0.955)).toFixed(selectedInstrument.decimals))
        );
      }
    }
  }, [isOpen, initialSignal, selectedInstrument, direction, fetchJournals]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Submit New Trade Journal
  const handleCreateTrade = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/trade-journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol,
          type: selectedInstrument.type,
          direction,
          entryPrice: Number(entryPrice),
          stopLoss: Number(stopLoss),
          takeProfit: Number(takeProfit),
          positionSize: Number(positionSize),
          quantity: Number((positionSize / entryPrice).toFixed(4)),
          timeframe: '1h',
          aiSignalUsed,
          aiConfidence: aiSignalUsed ? aiConfidence : undefined,
          strategy,
          notes,
          tags: [selectedInstrument.type, aiSignalUsed ? 'AI-Verified' : 'Manual', strategy.split(' ')[0]],
        }),
      });

      if (res.ok) {
        const json = await res.json();
        showToast(json.message || 'Trade berhasil dicatat ke database!');
        setActiveTab('list');
        fetchJournals();
      }
    } catch (err) {
      console.error('Error logging trade:', err);
    }
  };

  // Close an open trade
  const handleExecuteCloseTrade = async (id: string) => {
    try {
      const res = await fetch('/api/trade-journal', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id,
          exitPrice: Number(closingExitPrice),
          notes: closingNotes,
        }),
      });

      if (res.ok) {
        showToast('Trade berhasil ditutup dan dievaluasi!');
        setClosingTradeId(null);
        fetchJournals();
      }
    } catch (err) {
      console.error('Error closing trade:', err);
    }
  };

  // Delete trade
  const handleDeleteTrade = async (id: string) => {
    if (!confirm('Hapus catatan trade ini dari jurnal database?')) return;
    try {
      const res = await fetch(`/api/trade-journal?id=${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        showToast('Catatan trade berhasil dihapus.');
        fetchJournals();
      }
    } catch (err) {
      console.error('Error deleting trade:', err);
    }
  };

  if (!isOpen) return null;

  // Filtered journals for view
  const filteredJournals = journals.filter((j) => {
    if (filterOutcome === 'ALL') return true;
    if (filterOutcome === 'OPEN') return j.status === 'OPEN';
    if (filterOutcome === 'CLOSED') return j.status === 'CLOSED';
    if (filterOutcome === 'WIN') return j.outcome === 'WIN';
    if (filterOutcome === 'LOSS') return j.outcome === 'LOSS';
    return true;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-[#0A0E1A] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-xs">
        {/* Top Modal Header */}
        <div className="px-5 py-3.5 bg-[#0C1222] border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#00F0FF]/15 to-emerald-500/15 border border-[#00F0FF]/30 glow-cyan-sm">
              <BookOpen className="w-5 h-5 text-[#00F0FF]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-extrabold text-white tracking-tight">
                  BetaTech Trade Journal
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                  PostgreSQL / Supabase ORM
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Pencatatan hasil simulasi, evaluasi psikologi trading, dan analisis performa kuantitatif.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Performance KPI Stats Ribbon */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#080B14] border-b border-slate-800/80 font-mono text-[11px] shrink-0">
          <div className="p-2.5 rounded-xl bg-[#0D1324] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <Award className="w-3 h-3 text-[#00F0FF]" />
              <span>Win Rate</span>
            </div>
            <div className="text-base font-extrabold text-emerald-400 mt-0.5">
              {stats.winRate}%
            </div>
            <div className="text-[9px] text-slate-500 font-sans mt-0.5">
              {stats.closedTrades} trade selesai
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0D1324] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <DollarSign className="w-3 h-3 text-emerald-400" />
              <span>Total PnL Simulasi</span>
            </div>
            <div className={`text-base font-extrabold mt-0.5 ${stats.totalPnL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {stats.totalPnL >= 0 ? '+' : ''}${stats.totalPnL.toFixed(2)}
            </div>
            <div className="text-[9px] text-slate-500 font-sans mt-0.5">
              Realized profit/loss
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0D1324] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <BarChart2 className="w-3 h-3 text-amber-400" />
              <span>Rasio R:R Rata-rata</span>
            </div>
            <div className="text-base font-extrabold text-[#00F0FF] mt-0.5">
              1 : {stats.avgRiskRewardRatio}
            </div>
            <div className="text-[9px] text-slate-500 font-sans mt-0.5">
              Risk-to-Reward ratio
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-[#0D1324] border border-slate-800">
            <div className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
              <Layers className="w-3 h-3 text-purple-400" />
              <span>Total Catatan</span>
            </div>
            <div className="text-base font-extrabold text-white mt-0.5">
              {stats.totalTrades}
            </div>
            <div className="text-[9px] text-slate-500 font-sans mt-0.5">
              {stats.openTrades} posisi aktif berjalan
            </div>
          </div>
        </div>

        {/* Tab Controls: Daftar Jurnal vs Tambah Catatan */}
        <div className="px-5 pt-3 pb-2 bg-[#0A0E1A] border-b border-slate-800/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 p-1 bg-[#060912] rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('list')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'list'
                  ? 'bg-slate-800 text-[#00F0FF] border border-[#00F0FF]/30 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Riwayat Jurnal ({journals.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('create')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
                activeTab === 'create'
                  ? 'bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Catat Trade Baru</span>
            </button>
          </div>

          {activeTab === 'list' && (
            <div className="flex items-center gap-1 font-mono text-[10px]">
              {(['ALL', 'OPEN', 'CLOSED', 'WIN', 'LOSS'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterOutcome(filter)}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    filterOutcome === filter
                      ? 'bg-slate-800 text-white font-bold border border-slate-700'
                      : 'text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Toast Alert */}
        {toastMessage && (
          <div className="mx-5 my-2 p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 flex items-center gap-2 text-xs animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {/* ======================================================== */}
          {/* TAB 1: RIWAYAT JURNAL TRADING */}
          {/* ======================================================== */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {isLoading ? (
                <div className="py-12 text-center text-slate-500">
                  Memuat data jurnal trading dari database...
                </div>
              ) : filteredJournals.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <div className="mx-auto w-10 h-10 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-500">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <p className="text-slate-400">Belum ada catatan jurnal pada filter ini.</p>
                  <button
                    onClick={() => setActiveTab('create')}
                    className="px-3 py-1.5 rounded-lg bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 font-semibold text-xs inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Trade Pertama Sekarang</span>
                  </button>
                </div>
              ) : (
                filteredJournals.map((trade) => {
                  const isLong = trade.direction === 'LONG';
                  const isWin = trade.outcome === 'WIN';
                  const isClosed = trade.status === 'CLOSED';

                  return (
                    <div
                      key={trade.id}
                      className="p-3.5 rounded-xl bg-[#0D1322] border border-slate-800 hover:border-slate-700 transition-all space-y-2.5"
                    >
                      {/* Top Row: Symbol, Direction, Status Pill */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-white">{trade.symbol}</span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1 ${
                              isLong
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {isLong ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                            {trade.direction}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 uppercase">
                            {trade.timeframe || '1h'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 font-mono">
                          {isClosed ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isWin
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                              }`}
                            >
                              CLOSED • {trade.outcome} ({trade.pnl && trade.pnl >= 0 ? '+' : ''}${trade.pnl})
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/20 text-blue-400 border border-blue-500/40 animate-pulse">
                              OPEN POSITION
                            </span>
                          )}

                          <button
                            onClick={() => handleDeleteTrade(trade.id)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                            title="Hapus entri jurnal"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Execution Levels Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-[10px] bg-black/40 p-2 rounded-lg border border-slate-800/80">
                        <div>
                          <div className="text-slate-500 font-sans">Harga Masuk</div>
                          <div className="text-slate-100 font-bold">${trade.entryPrice}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-sans">Stop Loss</div>
                          <div className="text-rose-400 font-semibold">${trade.stopLoss}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-sans">Take Profit</div>
                          <div className="text-emerald-400 font-semibold">${trade.takeProfit}</div>
                        </div>
                        <div>
                          <div className="text-slate-500 font-sans">Ukuran Posisi</div>
                          <div className="text-white font-semibold">${trade.positionSize.toLocaleString()}</div>
                        </div>
                      </div>

                      {/* Strategy, AI Badge & User Notes */}
                      <div className="space-y-1.5 pt-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-[10px]">
                          <span className="text-slate-400">Strategi: <strong className="text-slate-200">{trade.strategy || 'Umum'}</strong></span>
                          <span>•</span>
                          <span className="text-slate-400">R:R: <strong className="text-[#00F0FF]">1:{trade.riskRewardRatio}</strong></span>
                          {trade.aiSignalUsed && (
                            <span className="px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              <span>AI Sinyal ({trade.aiConfidence}%)</span>
                            </span>
                          )}
                        </div>

                        {trade.notes && (
                          <div className="text-[11px] text-slate-300 bg-slate-900/50 p-2 rounded border border-slate-800/60 leading-relaxed font-sans">
                            {trade.notes}
                          </div>
                        )}
                      </div>

                      {/* Trade Closure Action for Open Trades */}
                      {!isClosed && (
                        <div className="pt-1 flex items-center justify-between border-t border-slate-800/60">
                          <span className="text-[10px] text-slate-400">Simulasi masih berjalan</span>
                          {closingTradeId === trade.id ? (
                            <div className="flex items-center gap-1.5 animate-in fade-in">
                              <input
                                type="number"
                                step="any"
                                value={closingExitPrice}
                                onChange={(e) => setClosingExitPrice(parseFloat(e.target.value) || 0)}
                                placeholder="Harga Keluar..."
                                className="w-28 px-2 py-1 bg-black text-xs font-mono text-white rounded border border-slate-700 focus:outline-none focus:border-[#00F0FF]"
                              />
                              <button
                                onClick={() => handleExecuteCloseTrade(trade.id)}
                                className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-[11px] rounded transition-colors"
                              >
                                Konfirmasi Tutup
                              </button>
                              <button
                                onClick={() => setClosingTradeId(null)}
                                className="p-1 text-slate-400 hover:text-white"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setClosingTradeId(trade.id);
                                setClosingExitPrice(selectedInstrument.price);
                              }}
                              className="px-2.5 py-1 rounded bg-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF]/25 font-semibold text-[11px] transition-colors"
                            >
                              Tutup & Hitung PnL
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}

          {/* ======================================================== */}
          {/* TAB 2: FORMULIR CATAT TRADE BARU */}
          {/* ======================================================== */}
          {activeTab === 'create' && (
            <form onSubmit={handleCreateTrade} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Symbol & Direction */}
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Simbol / Aset
                  </label>
                  <input
                    type="text"
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0D1324] text-white font-mono font-bold rounded-lg border border-slate-800 focus:outline-none focus:border-[#00F0FF]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Arah Posisi (Direction)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDirection('LONG')}
                      className={`py-1.5 rounded-lg font-bold transition-all ${
                        direction === 'LONG'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 glow-emerald-sm'
                          : 'bg-[#0D1324] text-slate-400 border border-slate-800'
                      }`}
                    >
                      BUY / LONG
                    </button>
                    <button
                      type="button"
                      onClick={() => setDirection('SHORT')}
                      className={`py-1.5 rounded-lg font-bold transition-all ${
                        direction === 'SHORT'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 glow-rose'
                          : 'bg-[#0D1324] text-slate-400 border border-slate-800'
                      }`}
                    >
                      SELL / SHORT
                    </button>
                  </div>
                </div>
              </div>

              {/* Price Levels Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <div className="flex justify-between text-[10px] text-slate-400 uppercase font-semibold mb-1">
                    <span>Harga Masuk</span>
                    <button
                      type="button"
                      onClick={() => setEntryPrice(selectedInstrument.price)}
                      className="text-[#00F0FF] hover:underline"
                    >
                      Gunakan Live
                    </button>
                  </div>
                  <input
                    type="number"
                    step="any"
                    value={entryPrice}
                    onChange={(e) => setEntryPrice(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-[#0D1324] text-white font-mono rounded-lg border border-slate-800 focus:outline-none focus:border-[#00F0FF]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-rose-400 uppercase font-semibold block mb-1">
                    Stop Loss (Proteksi)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-[#0D1324] text-rose-300 font-mono rounded-lg border border-rose-500/30 focus:outline-none focus:border-rose-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-emerald-400 uppercase font-semibold block mb-1">
                    Take Profit (Target)
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-[#0D1324] text-emerald-300 font-mono rounded-lg border border-emerald-500/30 focus:outline-none focus:border-emerald-400"
                    required
                  />
                </div>
              </div>

              {/* Position Size & Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Ukuran Posisi Simulasi ($)
                  </label>
                  <input
                    type="number"
                    value={positionSize}
                    onChange={(e) => setPositionSize(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-1.5 bg-[#0D1324] text-white font-mono rounded-lg border border-slate-800 focus:outline-none focus:border-[#00F0FF]"
                    required
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                    Setup / Strategi
                  </label>
                  <select
                    value={strategy}
                    onChange={(e) => setStrategy(e.target.value)}
                    className="w-full px-3 py-1.5 bg-[#0D1324] text-white rounded-lg border border-slate-800 focus:outline-none focus:border-[#00F0FF]"
                  >
                    <option value="Wyckoff Spring + RSI Rebound">Wyckoff Spring + RSI Rebound</option>
                    <option value="EMA Golden Cross 20/50">EMA Golden Cross 20/50</option>
                    <option value="London Open Liquidity Sweep">London Open Liquidity Sweep</option>
                    <option value="Order Block Retest">Order Block Retest</option>
                    <option value="Breakout Support/Resistance">Breakout Support/Resistance</option>
                    <option value="AI Recommendation Execution">AI Recommendation Execution</option>
                  </select>
                </div>
              </div>

              {/* AI Verification Checkbox */}
              <div className="p-3 rounded-xl bg-[#0D1324] border border-slate-800 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={aiSignalUsed}
                    onChange={(e) => setAiSignalUsed(e.target.checked)}
                    className="w-4 h-4 rounded accent-[#00F0FF]"
                  />
                  <span className="text-slate-200 font-semibold text-[11px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#00F0FF]" />
                    Mengikuti Konfirmasi Sinyal AI (Gemini / OpenAI)?
                  </span>
                </label>

                {aiSignalUsed && (
                  <div className="flex items-center gap-1 text-[11px] font-mono">
                    <span className="text-slate-400">Confidence:</span>
                    <span className="text-[#00F0FF] font-bold">{aiConfidence}%</span>
                  </div>
                )}
              </div>

              {/* Reflection Notes */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase font-semibold block mb-1">
                  Catatan Analisa & Psikologi Trading
                </label>
                <textarea
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Contoh: Masuk setelah konfirmasi rejection candle 1H, disiplin stop loss 1.5%, emosi tenang..."
                  className="w-full px-3 py-2 bg-[#0D1324] text-white rounded-lg border border-slate-800 focus:outline-none focus:border-[#00F0FF] text-xs leading-relaxed"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#00F0FF] to-emerald-400 hover:opacity-95 text-black font-extrabold text-xs flex items-center justify-center gap-2 glow-cyan transition-transform active:scale-98"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>💾 Simpan Trade ke Database Supabase</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('list')}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
                >
                  Batal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
