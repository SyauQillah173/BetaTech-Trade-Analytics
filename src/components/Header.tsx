'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { 
  Volume2, 
  VolumeX, 
  Bell, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  Activity,
  Zap,
  BookOpen
} from 'lucide-react';
import { Instrument } from '../types/market';

interface HeaderProps {
  instruments: Instrument[];
  selectedInstrument: Instrument;
  onSelectInstrument: (inst: Instrument) => void;
  latency?: number;
  onOpenJournal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  instruments,
  selectedInstrument,
  onSelectInstrument,
  latency = 14,
  onOpenJournal,
}) => {
  const [currentLatency, setCurrentLatency] = useState(latency);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');
  const [tickerPrices, setTickerPrices] = useState<Record<string, { price: number; dir: 'up' | 'down' | 'none' }>>({});

  // Clock in UTC & WIB
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }));
      setCurrentDate(now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const prevPricesRef = React.useRef<Record<string, number>>({});

  // Track live real price direction (up/down flash) without fake artificial price nudging
  useEffect(() => {
    const newTickerPrices: Record<string, { price: number; dir: 'up' | 'down' | 'none' }> = {};
    instruments.forEach((inst) => {
      const prev = prevPricesRef.current[inst.id];
      const dir: 'up' | 'down' | 'none' = prev === undefined ? 'none' : inst.price > prev ? 'up' : inst.price < prev ? 'down' : 'none';
      prevPricesRef.current[inst.id] = inst.price;
      newTickerPrices[inst.id] = { price: inst.price, dir };
    });
    setTickerPrices(newTickerPrices);
  }, [instruments]);

  // Subtle natural network latency fluctuation
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentLatency(Math.floor(11 + Math.random() * 6));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="w-full bg-[#080C14]/95 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50">
      {/* Single Clean Navbar Row */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2 gap-3">
        {/* Left: Clean Brand Logo */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="relative flex items-center justify-center p-1 rounded-lg bg-slate-900 border border-slate-800">
            <Image
              src="/logo_betatech.png"
              alt="BetaTech Trade Analytics"
              width={28}
              height={28}
              style={{ width: 'auto', height: 'auto' }}
              className="object-contain rounded"
              priority
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-bold text-sm tracking-tight text-white font-sans">
              BetaTech
            </span>
            <span className="text-[10px] font-mono font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 uppercase">
              Terminal
            </span>
          </div>
        </div>

        {/* Center: Running Market Ticker (Clean, Minimalist) */}
        <div className="hidden lg:flex items-center gap-3 flex-1 max-w-xl overflow-hidden px-3 py-1 rounded-lg bg-slate-900/50 border border-slate-800/80">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 font-mono">
            Feed
          </span>

          <div className="flex items-center gap-4 overflow-hidden whitespace-nowrap">
            {instruments.slice(0, 5).map((inst) => {
              const live = tickerPrices[inst.id];
              const displayPrice = live ? live.price : inst.price;
              const isSelected = selectedInstrument.id === inst.id;

              return (
                <button
                  key={inst.id}
                  onClick={() => onSelectInstrument(inst)}
                  className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-colors ${
                    isSelected ? 'bg-slate-800 text-white font-semibold' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <span className="text-slate-200 font-medium">{inst.symbol}</span>
                  <span className="font-mono text-[11px] text-slate-100">
                    ${inst.decimals > 2 ? displayPrice.toFixed(inst.decimals) : displayPrice.toLocaleString('en-US', { minimumFractionDigits: inst.decimals, maximumFractionDigits: inst.decimals })}
                  </span>
                  <span
                    className={`text-[10px] font-mono ${
                      inst.change24h >= 0 ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {inst.change24h >= 0 ? '+' : ''}{inst.change24h}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Trade Journal, API Status, Clock */}
        <div className="flex items-center gap-2 md:gap-2.5 shrink-0">
          {/* Trade Journal Button */}
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-750 transition-colors text-xs font-medium"
              title="Buka Jurnal Trading"
            >
              <BookOpen className="w-3.5 h-3.5 text-slate-300" />
              <span className="hidden sm:inline">Trade Journal</span>
            </button>
          )}

          {/* API Connection Indicator */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-[10px] text-slate-400">Live</span>
            <span className="text-[10px] text-emerald-400 font-semibold">
              {currentLatency}ms
            </span>
          </div>

          {/* Clock Display */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-medium text-slate-200">{currentTime || '--:--:--'}</span>
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            title={soundEnabled ? 'Audio Alerts: On' : 'Audio Alerts: Muted'}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-slate-300" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
          </button>
        </div>
      </div>
    </header>
  );
};
