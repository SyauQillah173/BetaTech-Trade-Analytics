'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { Header } from '../components/Header';
import { SidebarLeft } from '../components/SidebarLeft';
import { LightweightChartPanel as MainChartPanel } from '../components/LightweightChartPanel';
import { AnalyticsPanelRight as SidePanelRight } from '../components/AnalyticsPanelRight';
import { TradeJournalModal } from '../components/TradeJournalModal';
import { INITIAL_INSTRUMENTS } from '../data/mockData';
import { Instrument, Timeframe, GeneratedAISignal } from '../types/market';
import { useCryptoTickers } from '../hooks/useMarketData';
import { SlidersHorizontal, BarChart2, Compass } from 'lucide-react';

export default function DashboardPage() {
  const [instruments, setInstruments] = useState<Instrument[]>(INITIAL_INSTRUMENTS);
  const [selectedId, setSelectedId] = useState<string>(INITIAL_INSTRUMENTS[0].id);
  const [timeframe, setTimeframe] = useState<Timeframe>('1h');
  
  // Trade Journal Modal State
  const [isJournalModalOpen, setIsJournalModalOpen] = useState(false);
  const [journalInitialSignal, setJournalInitialSignal] = useState<GeneratedAISignal | null>(null);

  // Mobile tab view toggle (chart, watchlist, analytics)
  const [mobileView, setMobileView] = useState<'chart' | 'watchlist' | 'panel'>('chart');

  // SWR Live Crypto Tickers (auto-refreshes every 3 seconds from Binance API)
  const { tickers } = useCryptoTickers(3000);

  // Sync initial watchlists from database / fallback on mount
  useEffect(() => {
    async function loadWatchlistFromDb() {
      try {
        const res = await fetch('/api/watchlist');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data) && json.data.length > 0) {
            const dbSymbols = new Set(json.data.map((item: { symbol: string }) => item.symbol));
            setInstruments(prev =>
              prev.map(inst => ({
                ...inst,
                isFavorite: inst.isFavorite || dbSymbols.has(inst.symbol),
              }))
            );
          }
        }
      } catch (e) {
        console.warn('Failed to load initial watchlist from DB:', e);
      }
    }
    loadWatchlistFromDb();
  }, []);

  // Merge real-time crypto prices into instruments list
  const liveInstruments = useMemo(() => {
    return instruments.map(inst => {
      const live = tickers[inst.id];
      if (!live) return inst;
      return {
        ...inst,
        price: live.price,
        change24h: live.change24h,
        high24h: live.high24h,
        low24h: live.low24h,
        volume24h: live.volume24h,
      };
    });
  }, [instruments, tickers]);

  // Currently active selected instrument
  const selectedInstrument = useMemo(() => {
    return liveInstruments.find(inst => inst.id === selectedId) || liveInstruments[0];
  }, [liveInstruments, selectedId]);

  // Toggle favorite on instrument
  const handleToggleFavorite = (id: string) => {
    setInstruments(prev =>
      prev.map(inst =>
        inst.id === id ? { ...inst, isFavorite: !inst.isFavorite } : inst
      )
    );
  };

  const handleSelectInstrument = (inst: Instrument) => {
    setSelectedId(inst.id);
    setMobileView('chart');
  };

  // Open Trade Journal Modal
  const handleOpenJournal = (signal?: GeneratedAISignal) => {
    setJournalInitialSignal(signal || null);
    setIsJournalModalOpen(true);
  };

  // Add instrument to Watchlist
  const handleAddInstrument = (newInst: Instrument) => {
    setInstruments(prev => {
      if (prev.some(i => i.symbol === newInst.symbol)) {
        return prev.map(i => i.symbol === newInst.symbol ? { ...i, isFavorite: true } : i);
      }
      return [newInst, ...prev];
    });
    setSelectedId(newInst.id);
  };

  // Remove instrument from Watchlist
  const handleRemoveInstrument = (symbol: string) => {
    setInstruments(prev => {
      const updated = prev.filter(i => i.symbol !== symbol);
      if (selectedId === prev.find(i => i.symbol === symbol)?.id && updated.length > 0) {
        setSelectedId(updated[0].id);
      }
      return updated;
    });
  };

  return (
    <div className="flex flex-col h-full h-[100dvh] w-full overflow-hidden bg-[#06080F] text-slate-100 select-none overscroll-none">
      {/* 1. Header / Top Bar */}
      <Header
        instruments={liveInstruments}
        selectedInstrument={selectedInstrument}
        onSelectInstrument={handleSelectInstrument}
        latency={14}
        onOpenJournal={() => handleOpenJournal()}
      />

      {/* Mobile & Tablet Tab Switcher (Visible on < lg screens) */}
      <div className="lg:hidden flex items-center justify-around bg-[#090D18] border-b border-slate-800 p-1 text-xs shrink-0 z-20">
        <button
          onClick={() => setMobileView('watchlist')}
          className={`py-1.5 px-3 rounded flex items-center gap-1.5 transition-all ${
            mobileView === 'watchlist' ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>Watchlist</span>
        </button>
        <button
          onClick={() => setMobileView('chart')}
          className={`py-1.5 px-3 rounded flex items-center gap-1.5 transition-all ${
            mobileView === 'chart' ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BarChart2 className="w-3.5 h-3.5" />
          <span>Grafik & Analisa</span>
        </button>
        <button
          onClick={() => setMobileView('panel')}
          className={`py-1.5 px-3 rounded flex items-center gap-1.5 transition-all ${
            mobileView === 'panel' ? 'bg-[#00F0FF]/20 text-[#00F0FF] font-bold border border-[#00F0FF]/30' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>Signal & Scanner</span>
        </button>
      </div>

      {/* Main Layout Work Area: 3-Column Desktop Grid / Responsive Tabs on Mobile & Tablet */}
      <main className="flex-1 flex flex-row overflow-hidden min-h-0 relative">
        {/* 2. Sidebar Kiri (Watchlist, Pencarian & Filter Pasar) */}
        <div className={`h-full ${mobileView === 'watchlist' ? 'w-full block' : 'hidden lg:block'} shrink-0`}>
          <SidebarLeft
            instruments={liveInstruments}
            selectedInstrument={selectedInstrument}
            onSelectInstrument={handleSelectInstrument}
            onToggleFavorite={handleToggleFavorite}
            onAddInstrument={handleAddInstrument}
            onRemoveInstrument={handleRemoveInstrument}
          />
        </div>

        {/* 3. Main Panel Tengah (Grafik Interaktif Lightweight Charts & Technical Scanner) */}
        <div className={`flex-1 h-full min-w-0 ${mobileView === 'chart' ? 'flex' : 'hidden lg:flex'} flex-col`}>
          <MainChartPanel
            instruments={liveInstruments}
            selectedInstrument={selectedInstrument}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onSelectInstrument={handleSelectInstrument}
          />
        </div>

        {/* 4. Side Panel Kanan (Multi-Pair Signal Screener & Technical Gauge) */}
        <div className={`h-full ${mobileView === 'panel' ? 'w-full block' : 'hidden lg:block'} shrink-0`}>
          <SidePanelRight
            instruments={liveInstruments}
            selectedInstrument={selectedInstrument}
            timeframe={timeframe}
            onTimeframeChange={setTimeframe}
            onSelectInstrument={handleSelectInstrument}
            onOpenJournal={() => handleOpenJournal()}
            onOpenJournalWithSignal={(signal) => handleOpenJournal(signal)}
          />
        </div>
      </main>

      {/* 5. Trade Journal Modal (Prisma ORM & PostgreSQL / Supabase) */}
      <TradeJournalModal
        isOpen={isJournalModalOpen}
        onClose={() => setIsJournalModalOpen(false)}
        selectedInstrument={selectedInstrument}
        initialSignal={journalInitialSignal}
      />
    </div>
  );
}
