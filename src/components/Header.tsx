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

  // Latency & ticker micro-variation simulation for real-time feel
  useEffect(() => {
    const interval = setInterval(() => {
      // Natural jitter in latency between 11ms and 18ms
      setCurrentLatency(Math.floor(11 + Math.random() * 7));

      // Randomly nudge 1 ticker price slightly for live activity flash
      if (instruments.length > 0) {
        const randomIdx = Math.floor(Math.random() * instruments.length);
        const target = instruments[randomIdx];
        const delta = (Math.random() - 0.49) * 0.0008 * target.price;
        const newPrice = target.price + delta;
        setTickerPrices(prev => ({
          ...prev,
          [target.id]: {
            price: newPrice,
            dir: delta >= 0 ? 'up' : 'down'
          }
        }));
      }
    }, 2800);

    return () => clearInterval(interval);
  }, [instruments]);

  return (
    <header className="w-full bg-[#080C14]/95 border-b border-slate-800/80 backdrop-blur-md sticky top-0 z-50">
      {/* Top Navbar Row */}
      <div className="flex items-center justify-between px-3 md:px-5 py-2.5 gap-3 border-b border-slate-800/50">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="relative flex items-center justify-center p-1 rounded-xl bg-slate-900 border border-slate-700/80">
            <Image
              src="/logo_betatech.png"
              alt="BetaTech Trade Analytics"
              width={34}
              height={34}
              style={{ width: 'auto', height: 'auto' }}
              className="object-contain rounded-lg"
              priority
            />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-base md:text-lg tracking-tight text-white">
                BetaTech
              </span>
              <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 uppercase tracking-wider">
                Analytics
              </span>
              <span className="hidden sm:inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                Screener v2.5
              </span>
            </div>
            <span className="text-[10px] text-slate-400 tracking-wider uppercase font-medium hidden md:block">
              Market Intelligence & Technical Screener
            </span>
          </div>
        </div>

        {/* Center: Running Market Ticker (Preview bar) */}
        <div className="hidden lg:flex items-center gap-4 flex-1 max-w-2xl overflow-hidden px-4 py-1 rounded-lg bg-slate-900/60 border border-slate-800/80">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 shrink-0 uppercase tracking-wider">
            <Zap className="w-3.5 h-3.5 text-[#00F0FF] animate-pulse" />
            <span>Feed:</span>
          </div>

          <div className="flex items-center gap-5 overflow-hidden whitespace-nowrap">
            {instruments.slice(0, 5).map((inst) => {
              const live = tickerPrices[inst.id];
              const displayPrice = live ? live.price : inst.price;
              const isSelected = selectedInstrument.id === inst.id;

              return (
                <button
                  key={inst.id}
                  onClick={() => onSelectInstrument(inst)}
                  className={`flex items-center gap-2 px-2 py-0.5 rounded text-xs transition-all duration-200 hover:bg-slate-800/80 ${
                    isSelected ? 'bg-[#00F0FF]/10 text-white border border-[#00F0FF]/30' : 'text-slate-300'
                  }`}
                >
                  <span className="font-semibold text-slate-200">{inst.symbol}</span>
                  <span
                    className={`font-mono text-[11px] font-medium transition-colors ${
                      live?.dir === 'up'
                        ? 'text-emerald-400 flash-up'
                        : live?.dir === 'down'
                        ? 'text-rose-400 flash-down'
                        : 'text-slate-100'
                    }`}
                  >
                    ${inst.decimals > 2 ? displayPrice.toFixed(inst.decimals) : displayPrice.toLocaleString('en-US', { minimumFractionDigits: inst.decimals, maximumFractionDigits: inst.decimals })}
                  </span>
                  <span
                    className={`text-[10px] font-mono px-1 py-0.2 rounded flex items-center gap-0.5 ${
                      inst.change24h >= 0 ? 'text-emerald-400 bg-emerald-500/10' : 'text-rose-400 bg-rose-500/10'
                    }`}
                  >
                    {inst.change24h >= 0 ? '+' : ''}{inst.change24h}%
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Trade Journal, API Status, Time, Alerts */}
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          {/* Trade Journal Button */}
          {onOpenJournal && (
            <button
              onClick={onOpenJournal}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gradient-to-r from-blue-600/20 to-[#00F0FF]/15 text-[#00F0FF] border border-[#00F0FF]/30 hover:bg-[#00F0FF]/25 transition-all text-xs font-semibold glow-cyan-sm"
              title="Buka Jurnal Trading (PostgreSQL / Supabase)"
            >
              <BookOpen className="w-3.5 h-3.5 text-[#00F0FF]" />
              <span className="hidden sm:inline">Trade Journal</span>
            </button>
          )}

          {/* API Connection Indicator */}
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-lg bg-slate-900/90 border border-slate-800 text-xs shadow-inner">
            <div className="relative flex items-center justify-center">
              <span className="relative h-2 w-2 rounded-full bg-emerald-400" />
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 leading-none">
                <span className="text-[11px] font-semibold text-slate-200">Live API</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/15 px-1 py-0.2 rounded border border-emerald-500/20">
                  {currentLatency}ms
                </span>
              </div>
              <span className="text-[9px] text-slate-400 leading-none mt-0.5 hidden sm:inline">
                Binance REST (3s)
              </span>
            </div>
          </div>

          {/* Clock Display */}
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-900/80 border border-slate-800 text-xs text-slate-300 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#00F0FF]" />
            <div className="flex flex-col text-right leading-none">
              <span className="font-bold text-slate-100">{currentTime || '--:--:--'}</span>
              <span className="text-[9px] text-slate-500 mt-0.5">{currentDate ? `${currentDate} (WIB)` : 'UTC+7'}</span>
            </div>
          </div>

          {/* Audio Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-[#00F0FF] transition-colors"
            title={soundEnabled ? 'Audio Alerts: On' : 'Audio Alerts: Muted'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-[#00F0FF]" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* Notification Alert Bell */}
          <div className="relative">
            <button className="p-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 border border-slate-800 text-slate-400 hover:text-slate-200 transition-colors">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-[#00F0FF] ring-2 ring-[#080C14]" />
            </button>
          </div>
        </div>
      </div>

      {/* Secondary Running Ticker Ribbon (Full Width Continuous Stream) */}
      <div className="w-full bg-[#070A12] border-b border-slate-800/40 py-1 px-2 overflow-hidden flex items-center">
        <div className="flex items-center gap-1 px-2 text-[10px] font-bold text-[#00F0FF] tracking-wider uppercase shrink-0 border-r border-slate-800/80 pr-3 mr-2">
          <Activity className="w-3 h-3 text-[#00F0FF] animate-pulse" />
          <span>MARKET TICKER</span>
        </div>

        <div className="overflow-hidden flex-1 relative mask-fade">
          <div className="animate-ticker flex items-center gap-8">
            {/* Duplicated list to create infinite marquee illusion */}
            {[...instruments, ...instruments].map((inst, idx) => (
              <div
                key={`${inst.id}-${idx}`}
                onClick={() => onSelectInstrument(inst)}
                className="inline-flex items-center gap-2 cursor-pointer group text-xs text-slate-300 hover:text-white transition-colors"
              >
                <span className="font-semibold text-slate-300 group-hover:text-[#00F0FF] transition-colors">
                  {inst.symbol}
                </span>
                <span className="font-mono text-slate-100 font-medium text-[11px]">
                  ${inst.decimals > 2 ? inst.price.toFixed(inst.decimals) : inst.price.toLocaleString('en-US', { minimumFractionDigits: inst.decimals, maximumFractionDigits: inst.decimals })}
                </span>
                <span
                  className={`flex items-center text-[10px] font-mono px-1 py-0.2 rounded ${
                    inst.change24h >= 0
                      ? 'text-emerald-400 bg-emerald-500/10'
                      : 'text-rose-400 bg-rose-500/10'
                  }`}
                >
                  {inst.change24h >= 0 ? (
                    <TrendingUp className="w-2.5 h-2.5 mr-0.5 inline" />
                  ) : (
                    <TrendingDown className="w-2.5 h-2.5 mr-0.5 inline" />
                  )}
                  {inst.change24h >= 0 ? '+' : ''}{inst.change24h}%
                </span>
                <span className="text-slate-700 text-xs select-none">•</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </header>
  );
};
