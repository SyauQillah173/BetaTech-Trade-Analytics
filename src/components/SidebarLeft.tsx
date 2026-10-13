'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Star, 
  TrendingUp, 
  Plus, 
  Globe, 
  Coins, 
  BarChart3, 
  X,
  Trash2,
  CheckCircle2,
  Database
} from 'lucide-react';
import { Instrument, MarketType } from '../types/market';

interface SidebarLeftProps {
  instruments: Instrument[];
  selectedInstrument: Instrument;
  onSelectInstrument: (inst: Instrument) => void;
  onToggleFavorite: (id: string) => void;
  onAddInstrument?: (inst: Instrument) => void;
  onRemoveInstrument?: (symbol: string) => void;
}

const QUICK_PRESETS = [
  { symbol: 'SOL/USD', name: 'Solana', type: 'crypto' as const, price: 198.4 },
  { symbol: 'DOGE/USD', name: 'Dogecoin', type: 'crypto' as const, price: 0.38 },
  { symbol: 'XRP/USD', name: 'Ripple', type: 'crypto' as const, price: 2.15 },
  { symbol: 'GBP/USD', name: 'British Pound', type: 'forex' as const, price: 1.285 },
  { symbol: 'XAU/USD', name: 'Gold Spot', type: 'commodities' as const, price: 2745.0 },
];

export const SidebarLeft: React.FC<SidebarLeftProps> = ({
  instruments,
  selectedInstrument,
  onSelectInstrument,
  onToggleFavorite,
  onAddInstrument,
  onRemoveInstrument,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMarket, setActiveMarket] = useState<MarketType>('all');
  const [filterMode, setFilterMode] = useState<'all' | 'favorites' | 'gainers'>('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newSymbolInput, setNewSymbolInput] = useState('');
  const [newNameInput, setNewNameInput] = useState('');
  const [newTypeInput, setNewTypeInput] = useState<'crypto' | 'forex' | 'commodities'>('crypto');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [confirmDeleteSymbol, setConfirmDeleteSymbol] = useState<string | null>(null);

  // Filter instruments based on market tab, search query, and filter mode
  const filteredInstruments = useMemo(() => {
    return instruments.filter((inst) => {
      // Market filter
      if (activeMarket !== 'all' && inst.type !== activeMarket) {
        return false;
      }

      // Filter mode
      if (filterMode === 'favorites' && !inst.isFavorite) {
        return false;
      }
      if (filterMode === 'gainers' && inst.change24h <= 0) {
        return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        return (
          inst.symbol.toLowerCase().includes(query) ||
          inst.name.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }, [instruments, activeMarket, filterMode, searchQuery]);

  // Mini sparkline SVG generator
  const renderSparkline = (points: number[], isPositive: boolean) => {
    if (!points || points.length < 2) return null;
    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 56;
    const height = 22;

    const coords = points.map((val, idx) => {
      const x = (idx / (points.length - 1)) * width;
      const y = height - ((val - min) / range) * (height - 4) - 2;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');

    const strokeColor = isPositive ? '#10B981' : '#F43F5E';

    return (
      <svg width={width} height={height} className="overflow-visible">
        <polyline
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          points={coords}
        />
      </svg>
    );
  };

  // Handler for adding to Watchlist (PostgreSQL / Supabase via API Route)
  const handleAddWatchlist = async (preset?: { symbol: string; name: string; type: 'crypto' | 'forex' | 'commodities'; price: number }) => {
    const rawSym = preset ? preset.symbol : newSymbolInput.trim();
    if (!rawSym) return;

    const sym = rawSym.toUpperCase();
    const formattedSym = sym.includes('/') ? sym : `${sym}/USD`;
    const targetType = preset ? preset.type : newTypeInput;
    const targetName = preset ? preset.name : (newNameInput.trim() || formattedSym.split('/')[0]);
    const targetPrice = preset ? preset.price : (targetType === 'forex' ? 1.0850 : targetType === 'crypto' ? 150.00 : 2700.00);

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: formattedSym,
          name: targetName,
          type: targetType,
        }),
      });

      const json = await res.json();
      if (res.ok) {
        const newInst: Instrument = {
          id: formattedSym.toLowerCase().replace('/', '-'),
          symbol: formattedSym,
          name: targetName,
          type: targetType,
          price: targetPrice,
          change24h: +(Math.random() * 3.5 - 1.2).toFixed(2),
          high24h: +(targetPrice * 1.025).toFixed(targetType === 'forex' ? 4 : 2),
          low24h: +(targetPrice * 0.975).toFixed(targetType === 'forex' ? 4 : 2),
          volume24h: '$1.8M',
          sparkline: [targetPrice * 0.98, targetPrice * 0.99, targetPrice * 1.005, targetPrice],
          decimals: formattedSym.includes('EUR') || (formattedSym.includes('USD') && targetType === 'forex') ? 4 : 2,
          isFavorite: true,
        };

        if (onAddInstrument) {
          onAddInstrument(newInst);
        }
        setToastMessage(json.message || `${formattedSym} ditambahkan ke database!`);
        setTimeout(() => setToastMessage(null), 3000);
        setNewSymbolInput('');
        setNewNameInput('');
        setIsAddModalOpen(false);
      }
    } catch (err) {
      console.error('Error adding watchlist item:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler for deleting from Watchlist (PostgreSQL / Supabase via API Route)
  const handleDeleteWatchlist = async (e: React.MouseEvent, symbol: string) => {
    e.stopPropagation();
    if (confirmDeleteSymbol === symbol) {
      try {
        const res = await fetch(`/api/watchlist?symbol=${encodeURIComponent(symbol)}`, {
          method: 'DELETE',
        });
        const json = await res.json();
        if (res.ok) {
          if (onRemoveInstrument) {
            onRemoveInstrument(symbol);
          }
          setToastMessage(json.message || `${symbol} dihapus dari Watchlist`);
          setTimeout(() => setToastMessage(null), 3000);
        }
      } catch (err) {
        console.error('Error deleting from watchlist:', err);
      } finally {
        setConfirmDeleteSymbol(null);
      }
    } else {
      setConfirmDeleteSymbol(symbol);
      setTimeout(() => {
        setConfirmDeleteSymbol(prev => (prev === symbol ? null : prev));
      }, 3500);
    }
  };

  return (
    <aside className="w-full md:w-72 lg:w-80 flex flex-col bg-[#090D18]/95 border-r border-slate-800/80 shrink-0 h-full overflow-hidden text-xs">
      {/* Search Header */}
      <div className="p-3 border-b border-slate-800/70 space-y-2.5 bg-[#0B0F1C]">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari simbol / pair (mis. BTC, EUR)..."
            className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#0F1524] text-xs text-slate-100 placeholder-slate-500 border border-slate-800 focus:outline-none focus:border-blue-500/60 focus:ring-1 focus:ring-blue-500/30 transition-all font-mono"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Market Filter Tabs: All, Crypto, Forex, Commodities */}
        <div className="flex items-center p-1 rounded-lg bg-[#070A12] border border-slate-800/80 text-[11px] font-medium text-slate-400">
          <button
            onClick={() => setActiveMarket('all')}
            className={`flex-1 py-1 px-2 rounded-md transition-all text-center ${
              activeMarket === 'all'
                ? 'bg-slate-800 text-white font-semibold shadow-sm'
                : 'hover:text-slate-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setActiveMarket('crypto')}
            className={`flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1 transition-all ${
              activeMarket === 'crypto'
                ? 'bg-slate-800 text-blue-400 font-semibold shadow-sm'
                : 'hover:text-slate-200'
            }`}
          >
            <Coins className="w-3 h-3" />
            <span>Crypto</span>
          </button>
          <button
            onClick={() => setActiveMarket('forex')}
            className={`flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1 transition-all ${
              activeMarket === 'forex'
                ? 'bg-slate-800 text-emerald-400 font-semibold shadow-sm'
                : 'hover:text-slate-200'
            }`}
          >
            <Globe className="w-3 h-3" />
            <span>Forex</span>
          </button>
          <button
            onClick={() => setActiveMarket('commodities')}
            className={`flex-1 py-1 px-2 rounded-md flex items-center justify-center gap-1 transition-all ${
              activeMarket === 'commodities'
                ? 'bg-slate-800 text-amber-400 font-semibold shadow-sm'
                : 'hover:text-slate-200'
            }`}
          >
            <span>Metal</span>
          </button>
        </div>

        {/* Watchlist Sub-Filters */}
        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2 py-0.5 rounded text-[11px] transition-colors ${
                filterMode === 'all'
                  ? 'bg-slate-800 text-slate-100 font-medium'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Semua
            </button>
            <button
              onClick={() => setFilterMode('favorites')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                filterMode === 'favorites'
                  ? 'bg-amber-500/20 text-amber-300 font-medium border border-amber-500/30'
                  : 'text-slate-400 hover:text-amber-400'
              }`}
            >
              <Star className="w-3 h-3 fill-current" />
              <span>Favorit</span>
            </button>
            <button
              onClick={() => setFilterMode('gainers')}
              className={`flex items-center gap-1 px-2 py-0.5 rounded text-[11px] transition-colors ${
                filterMode === 'gainers'
                  ? 'bg-emerald-500/20 text-emerald-300 font-medium border border-emerald-500/30'
                  : 'text-slate-400 hover:text-emerald-400'
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>Gainers</span>
            </button>
          </div>

          <button
            onClick={() => setIsAddModalOpen(!isAddModalOpen)}
            className="flex items-center gap-1 px-2 py-1 rounded bg-[#0F1524] hover:bg-slate-800 border border-blue-500/40 text-blue-400 hover:text-[#00F0FF] transition-colors font-medium text-[11px]"
            title="Tambah instrumen ke Database Watchlist"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Tambah</span>
          </button>
        </div>

        {/* Toast Feedback Notification */}
        {toastMessage && (
          <div className="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[11px] flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{toastMessage}</span>
          </div>
        )}

        {/* Quick Add Form Drawer (PostgreSQL / Supabase integration) */}
        {isAddModalOpen && (
          <div className="p-3 rounded-xl bg-[#0F1524] border border-blue-500/40 space-y-2.5 glow-cyan-sm animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between text-xs font-bold text-[#00F0FF]">
              <span className="flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-[#00F0FF]" />
                <span>Tambah ke DB Watchlist</span>
              </span>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="space-y-1.5">
              <input
                type="text"
                value={newSymbolInput}
                onChange={(e) => setNewSymbolInput(e.target.value)}
                placeholder="Simbol (mis. SOL/USD, DOGE/USD)..."
                className="w-full px-2.5 py-1.5 bg-black/50 text-xs text-white rounded-lg border border-slate-700 focus:outline-none focus:border-[#00F0FF] font-mono"
              />
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={newNameInput}
                  onChange={(e) => setNewNameInput(e.target.value)}
                  placeholder="Nama aset (opsional)..."
                  className="flex-1 px-2.5 py-1 bg-black/40 text-[11px] text-slate-200 rounded border border-slate-800 focus:outline-none focus:border-[#00F0FF]"
                />
                <select
                  value={newTypeInput}
                  onChange={(e) => setNewTypeInput(e.target.value as 'crypto' | 'forex' | 'commodities')}
                  className="px-2 py-1 bg-black/40 text-[11px] text-slate-300 rounded border border-slate-800 focus:outline-none"
                >
                  <option value="crypto">Crypto</option>
                  <option value="forex">Forex</option>
                  <option value="commodities">Metal</option>
                </select>
              </div>
            </div>

            {/* Quick Presets Chips */}
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 font-mono">Preset Cepat:</span>
              <div className="flex flex-wrap gap-1">
                {QUICK_PRESETS.map((p) => (
                  <button
                    key={p.symbol}
                    onClick={() => handleAddWatchlist(p)}
                    disabled={isSubmitting}
                    className="px-1.5 py-0.5 rounded bg-slate-800/80 hover:bg-blue-600/30 text-[10px] text-slate-300 hover:text-[#00F0FF] border border-slate-700/60 font-mono transition-colors"
                  >
                    +{p.symbol.split('/')[0]}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => handleAddWatchlist()}
              disabled={isSubmitting || !newSymbolInput.trim()}
              className="w-full py-1.5 bg-gradient-to-r from-blue-600 to-[#00F0FF] hover:opacity-90 disabled:opacity-50 text-black font-extrabold text-xs rounded-lg transition-all glow-cyan-sm"
            >
              {isSubmitting ? 'Menyimpan ke Supabase...' : 'Simpan ke Watchlist'}
            </button>
          </div>
        )}
      </div>

      {/* Watchlist Instrument List */}
      <div className="flex-1 overflow-y-auto px-2 py-1.5 space-y-1 pb-16 lg:pb-2">
        <div className="flex items-center justify-between px-2 py-1 text-[10px] uppercase font-mono tracking-wider text-slate-500 border-b border-slate-800/60 mb-1">
          <span>Pasangan / Aset</span>
          <span>Harga / Aksi</span>
        </div>

        {filteredInstruments.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500">
            Tidak ada instrumen yang sesuai filter.
          </div>
        ) : (
          filteredInstruments.map((inst) => {
            const isSelected = selectedInstrument.id === inst.id;
            const isPositive = inst.change24h >= 0;
            const isConfirming = confirmDeleteSymbol === inst.symbol;

            return (
              <div
                key={inst.id}
                onClick={() => onSelectInstrument(inst)}
                className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                  isSelected
                    ? 'bg-slate-800/90 border-[#00F0FF]/60 shadow-sm ring-1 ring-[#00F0FF]/20 text-white'
                    : 'bg-[#0B0F1D]/40 hover:bg-[#0F1626]/80 border-slate-800/40 hover:border-slate-700/60 text-slate-300'
                }`}
              >
                {/* Left: Star + Symbol info */}
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleFavorite(inst.id);
                    }}
                    className="text-slate-600 hover:text-amber-400 p-0.5 transition-colors shrink-0"
                    title={inst.isFavorite ? 'Hapus dari favorit' : 'Tambah ke favorit'}
                  >
                    <Star
                      className={`w-3.5 h-3.5 ${
                        inst.isFavorite ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                      }`}
                    />
                  </button>

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-xs text-slate-100 group-hover:text-[#00F0FF] transition-colors truncate">
                        {inst.symbol}
                      </span>
                      <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-slate-800/90 text-slate-400 font-mono">
                        {inst.type}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {inst.name}
                    </div>
                  </div>
                </div>

                {/* Center: Sparkline */}
                <div className="hidden sm:block shrink-0 px-1 opacity-80 group-hover:opacity-100 transition-opacity">
                  {renderSparkline(inst.sparkline, isPositive)}
                </div>

                {/* Right: Price & Change badge + Delete action */}
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right font-mono">
                    <div className="text-xs font-semibold text-slate-100">
                      ${inst.decimals > 2
                        ? inst.price.toFixed(inst.decimals)
                        : inst.price.toLocaleString('en-US', {
                            minimumFractionDigits: inst.decimals,
                            maximumFractionDigits: inst.decimals,
                          })}
                    </div>
                    <div
                      className={`inline-flex items-center justify-end text-[10px] px-1 py-0.2 rounded font-medium mt-0.5 ${
                        isPositive
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : 'text-rose-400 bg-rose-500/10'
                      }`}
                    >
                      {isPositive ? '+' : ''}
                      {inst.change24h}%
                    </div>
                  </div>

                  {/* Delete from Watchlist button */}
                  <div className="shrink-0 pl-1">
                    {isConfirming ? (
                      <button
                        onClick={(e) => handleDeleteWatchlist(e, inst.symbol)}
                        className="px-1.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold animate-pulse shadow-sm"
                        title="Klik untuk konfirmasi hapus dari Watchlist DB"
                      >
                        Hapus?
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteWatchlist(e, inst.symbol)}
                        className="p-1 rounded text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-all"
                        title="Hapus instrumen dari Watchlist"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Market Overview Widget at Bottom */}
      <div className="p-3 bg-[#070A14] border-t border-slate-800/80 space-y-2">
        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          <span className="flex items-center gap-1 text-slate-300">
            <BarChart3 className="w-3.5 h-3.5 text-blue-400" />
            <span>Kondisi Pasar Global</span>
          </span>
          <span className="text-emerald-400 font-mono text-[10px] flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            LIVE
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs font-mono">
          <div className="p-2 rounded-lg bg-[#0E1424] border border-slate-800">
            <div className="text-[10px] text-slate-400 leading-none">Fear & Greed</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm font-bold text-emerald-400">74</span>
              <span className="text-[10px] text-emerald-300">Greed</span>
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#0E1424] border border-slate-800">
            <div className="text-[10px] text-slate-400 leading-none">Dominasi BTC</div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-sm font-bold text-slate-200">58.4%</span>
              <span className="text-[10px] text-slate-400">+0.3%</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
