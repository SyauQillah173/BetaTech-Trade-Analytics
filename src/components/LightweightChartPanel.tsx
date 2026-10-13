'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  CandlestickChart, 
  LineChart,
  Layers,
  Radio,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  createChart,
  IChartApi,
  ISeriesApi,
  IPriceLine,
  CandlestickSeries,
  LineSeries,
  AreaSeries,
  HistogramSeries,
  ColorType,
  CrosshairMode,
  LineStyle,
  UTCTimestamp,
} from 'lightweight-charts';
import { Instrument, Timeframe } from '../types/market';
import { useInstrumentKlines } from '../hooks/useMarketData';
import { calculateEMA, calculateRSI } from '../services/marketApi';
import { 
  generateMarketSignals, 
  getTechnicalOverview, 
  getTimeframeMatrix 
} from '../services/signalEngine';

export interface MainChartPanelProps {
  instruments: Instrument[];
  selectedInstrument: Instrument;
  timeframe: Timeframe;
  onTimeframeChange: (tf: Timeframe) => void;
  onSelectInstrument: (inst: Instrument) => void;
}

export const LightweightChartPanel: React.FC<MainChartPanelProps> = ({
  instruments,
  selectedInstrument,
  timeframe,
  onTimeframeChange,
  onSelectInstrument,
}) => {
  const [chartType, setChartType] = useState<'candlestick' | 'line' | 'area'>('candlestick');
  const [showEMA20, setShowEMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [activeBottomTab, setActiveBottomTab] = useState<'signals' | 'pivots' | 'indicators'>('signals');
  const [isBottomCollapsed, setIsBottomCollapsed] = useState(false);

  // Chart DOM container and instance refs
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const lineSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const areaSeriesRef = useRef<ISeriesApi<'Area'> | null>(null);
  const volumeSeriesRef = useRef<ISeriesApi<'Histogram'> | null>(null);
  const ema20SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const ema50SeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const pivotLinesRef = useRef<IPriceLine[]>([]);

  // Performance tracking refs for zero-lag high-frequency candle updates
  const lastInstrumentRef = useRef<string>(selectedInstrument.id);
  const lastTfRef = useRef<Timeframe>(timeframe);
  const lastCandleTimeRef = useRef<number>(0);
  const lastCandleCountRef = useRef<number>(0);
  const hoverRafRef = useRef<number | null>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  // Real-time market data hooks (SWR auto-refreshing every few seconds)
  const { candles, isValidating: isKlinesValidating } = useInstrumentKlines(selectedInstrument, timeframe);

  // Technical overview and multi-pair signals
  const technical = useMemo(() => getTechnicalOverview(selectedInstrument), [selectedInstrument]);
  const tfMatrix = useMemo(() => getTimeframeMatrix(selectedInstrument), [selectedInstrument]);
  const marketSignals = useMemo(() => generateMarketSignals(instruments), [instruments]);

  // Hover crosshair metadata state
  const [hoveredData, setHoveredData] = useState<{
    time: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume?: number;
    ema20?: number;
    ema50?: number;
  } | null>(null);

  // Fallback to latest candle if not hovering
  const latestCandle = useMemo(() => {
    return candles.length > 0 ? candles[candles.length - 1] : null;
  }, [candles]);

  const activeDisplayBar = hoveredData || (latestCandle ? {
    time: new Date(latestCandle.time * 1000).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }),
    open: latestCandle.open,
    high: latestCandle.high,
    low: latestCandle.low,
    close: latestCandle.close,
    volume: latestCandle.volume,
  } : null);

  // RSI calculation
  const rsiValues = useMemo(() => calculateRSI(candles, 14), [candles]);
  const currentRSI = rsiValues.length > 0 ? rsiValues[rsiValues.length - 1].value : technical.rsi14;

  // Initialize TradingView lightweight-chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create chart instance
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#06080F' },
        textColor: '#94A3B8',
        fontFamily: 'monospace, -apple-system, BlinkMacSystemFont, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(30, 41, 59, 0.35)' },
        horzLines: { color: 'rgba(30, 41, 59, 0.35)' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#0F1524',
        },
        horzLine: {
          color: 'rgba(59, 130, 246, 0.5)',
          width: 1,
          style: LineStyle.Dashed,
          labelBackgroundColor: '#3B82F6',
        },
      },
      rightPriceScale: {
        borderColor: '#1E293B',
        textColor: '#94A3B8',
        scaleMargins: {
          top: 0.1,
          bottom: 0.2,
        },
      },
      timeScale: {
        borderColor: '#1E293B',
        timeVisible: true,
        secondsVisible: false,
      },
      autoSize: true,
    });

    chartRef.current = chart;

    // 1. Candlestick series
    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#10B981',
      downColor: '#F43F5E',
      borderVisible: false,
      wickUpColor: '#10B981',
      wickDownColor: '#F43F5E',
      visible: chartType === 'candlestick',
    });
    candleSeriesRef.current = candleSeries;

    // 2. Line series
    const lineSeries = chart.addSeries(LineSeries, {
      color: '#3B82F6',
      lineWidth: 2,
      crosshairMarkerVisible: true,
      visible: chartType === 'line',
    });
    lineSeriesRef.current = lineSeries;

    // 3. Area series
    const areaSeries = chart.addSeries(AreaSeries, {
      topColor: 'rgba(59, 130, 246, 0.35)',
      bottomColor: 'rgba(59, 130, 246, 0.0)',
      lineColor: '#3B82F6',
      lineWidth: 2,
      visible: chartType === 'area',
    });
    areaSeriesRef.current = areaSeries;

    // 4. Volume series (separate scale overlay at bottom)
    const volumeSeries = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume_scale',
      visible: showVolume,
    });
    chart.priceScale('volume_scale').applyOptions({
      scaleMargins: {
        top: 0.82,
        bottom: 0,
      },
    });
    volumeSeriesRef.current = volumeSeries;

    // 5. EMA 20 line
    const ema20Series = chart.addSeries(LineSeries, {
      color: '#38BDF8',
      lineWidth: 1,
      title: 'EMA 20',
      crosshairMarkerVisible: false,
      visible: showEMA20,
    });
    ema20SeriesRef.current = ema20Series;

    // 6. EMA 50 line
    const ema50Series = chart.addSeries(LineSeries, {
      color: '#10B981',
      lineWidth: 1,
      title: 'EMA 50',
      crosshairMarkerVisible: false,
      visible: showEMA50,
    });
    ema50SeriesRef.current = ema50Series;

    // Interactive Crosshair Hover handler (Throttled with requestAnimationFrame)
    chart.subscribeCrosshairMove((param) => {
      if (hoverRafRef.current) cancelAnimationFrame(hoverRafRef.current);
      hoverRafRef.current = requestAnimationFrame(() => {
        if (!param.time || !param.point) {
          setHoveredData(null);
          return;
        }

        const cs = candleSeriesRef.current;
        const vs = volumeSeriesRef.current;
        const e20 = ema20SeriesRef.current;
        const e50 = ema50SeriesRef.current;

        const cData = cs ? param.seriesData.get(cs) : null;
        const vData = vs ? param.seriesData.get(vs) : null;
        const e20Data = e20 ? param.seriesData.get(e20) : null;
        const e50Data = e50 ? param.seriesData.get(e50) : null;

        if (cData && 'close' in cData) {
          const timeStr = typeof param.time === 'number'
            ? new Date(param.time * 1000).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : String(param.time);

          const candleObj = cData as unknown as { open: number; high: number; low: number; close: number };
          const volObj = vData as unknown as { value: number } | null;
          const ema20Obj = e20Data as unknown as { value: number } | null;
          const ema50Obj = e50Data as unknown as { value: number } | null;

          setHoveredData({
            time: timeStr,
            open: candleObj.open,
            high: candleObj.high,
            low: candleObj.low,
            close: candleObj.close,
            volume: volObj && typeof volObj.value === 'number' ? volObj.value : undefined,
            ema20: ema20Obj && typeof ema20Obj.value === 'number' ? ema20Obj.value : undefined,
            ema50: ema50Obj && typeof ema50Obj.value === 'number' ? ema50Obj.value : undefined,
          });
        }
      });
    });

    // ResizeObserver: 100% fluid responsive scaling on mobile, tablet, and desktop
    if (chartContainerRef.current) {
      const ro = new ResizeObserver((entries) => {
        if (!entries || entries.length === 0 || !chartRef.current) return;
        const { width, height } = entries[0].contentRect;
        if (width > 0 && height > 0) {
          requestAnimationFrame(() => {
            chartRef.current?.applyOptions({ width, height });
          });
        }
      });
      ro.observe(chartContainerRef.current);
      resizeObserverRef.current = ro;
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }
      if (hoverRafRef.current) {
        cancelAnimationFrame(hoverRafRef.current);
      }
      chart.remove();
      chartRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run once on mount

  // High-Performance Series Update (O(1) in-place tick update when candle moves fast)
  useEffect(() => {
    if (!candles || candles.length === 0 || !chartRef.current) return;

    const isInstrumentChanged = selectedInstrument.id !== lastInstrumentRef.current;
    const isTfChanged = timeframe !== lastTfRef.current;
    const lastBar = candles[candles.length - 1];
    const isTickUpdate =
      !isInstrumentChanged &&
      !isTfChanged &&
      candles.length === lastCandleCountRef.current &&
      lastBar.time === lastCandleTimeRef.current;

    // Fast-path: Update existing bar in-place (<0.1ms execution, no canvas buffer thrashing)
    if (isTickUpdate) {
      requestAnimationFrame(() => {
        candleSeriesRef.current?.update({
          time: lastBar.time as UTCTimestamp,
          open: lastBar.open,
          high: lastBar.high,
          low: lastBar.low,
          close: lastBar.close,
        });
        lineSeriesRef.current?.update({
          time: lastBar.time as UTCTimestamp,
          value: lastBar.close,
        });
        areaSeriesRef.current?.update({
          time: lastBar.time as UTCTimestamp,
          value: lastBar.close,
        });
        volumeSeriesRef.current?.update({
          time: lastBar.time as UTCTimestamp,
          value: lastBar.volume,
          color: lastBar.close >= lastBar.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)',
        });
      });
      return;
    }

    // Full-path: Symbol changed, timeframe changed, or new bar opened
    lastInstrumentRef.current = selectedInstrument.id;
    lastTfRef.current = timeframe;
    lastCandleCountRef.current = candles.length;
    lastCandleTimeRef.current = lastBar.time;

    // Convert and sanitize timestamps (strictly ascending)
    const candleData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
    }));

    const lineData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.close,
    }));

    const volumeData = candles.map((c) => ({
      time: c.time as UTCTimestamp,
      value: c.volume,
      color: c.close >= c.open ? 'rgba(16, 185, 129, 0.45)' : 'rgba(244, 63, 94, 0.45)',
    }));

    const ema20Raw = calculateEMA(candles, 20);
    const ema20Data = ema20Raw.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.value,
    }));

    const ema50Raw = calculateEMA(candles, 50);
    const ema50Data = ema50Raw.map((d) => ({
      time: d.time as UTCTimestamp,
      value: d.value,
    }));

    candleSeriesRef.current?.setData(candleData);
    lineSeriesRef.current?.setData(lineData);
    areaSeriesRef.current?.setData(lineData);
    volumeSeriesRef.current?.setData(volumeData);
    ema20SeriesRef.current?.setData(ema20Data);
    ema50SeriesRef.current?.setData(ema50Data);

    // Adjust view bounds ONLY when instrument or timeframe changes
    if (isInstrumentChanged || isTfChanged) {
      chartRef.current?.timeScale().fitContent();
    }
  }, [candles, selectedInstrument.id, timeframe]);

  // Update Series Visibility
  useEffect(() => {
    candleSeriesRef.current?.applyOptions({ visible: chartType === 'candlestick' });
    lineSeriesRef.current?.applyOptions({ visible: chartType === 'line' });
    areaSeriesRef.current?.applyOptions({ visible: chartType === 'area' });
    volumeSeriesRef.current?.applyOptions({ visible: showVolume });
    ema20SeriesRef.current?.applyOptions({ visible: showEMA20 });
    ema50SeriesRef.current?.applyOptions({ visible: showEMA50 });
  }, [chartType, showVolume, showEMA20, showEMA50]);

  // Plot key technical pivot levels on chart
  useEffect(() => {
    const cs = candleSeriesRef.current;
    if (!cs) return;

    // Remove prior lines
    pivotLinesRef.current.forEach(line => {
      try {
        cs.removePriceLine(line);
      } catch {
        // ignore
      }
    });
    pivotLinesRef.current = [];

    // Add Pivot, R1, S1 lines
    try {
      const pLine = cs.createPriceLine({
        price: technical.pivot,
        color: '#3B82F6',
        lineWidth: 1,
        lineStyle: LineStyle.Dashed,
        axisLabelVisible: true,
        title: `PIVOT $${technical.pivot}`,
      });
      const r1Line = cs.createPriceLine({
        price: technical.r1,
        color: '#F43F5E',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `R1 $${technical.r1}`,
      });
      const s1Line = cs.createPriceLine({
        price: technical.s1,
        color: '#10B981',
        lineWidth: 1,
        lineStyle: LineStyle.Dotted,
        axisLabelVisible: true,
        title: `S1 $${technical.s1}`,
      });
      pivotLinesRef.current = [pLine, r1Line, s1Line];
    } catch {
      // ignore
    }
  }, [technical]);

  const timeframes: Timeframe[] = ['1m', '5m', '15m', '1h', '4h', '1d', '1w'];

  return (
    <section className="flex-1 flex flex-col bg-[#070A12] overflow-y-auto lg:overflow-hidden min-w-0">
      {/* Active Instrument Top Banner */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2 bg-[#0A0E1A]/95 border-b border-slate-800/80 gap-2">
        {/* Left: Active Asset Meta */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-xl md:text-2xl font-black text-white tracking-tight">
              {selectedInstrument.symbol}
            </span>
            <span className="text-[10px] sm:text-xs px-1.5 sm:px-2 py-0.5 rounded-full font-mono font-medium bg-slate-800 text-slate-300 border border-slate-700">
              {selectedInstrument.name}
            </span>
            <span
              className={`text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded border ${
                technical.bias === 'BULLISH'
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                  : technical.bias === 'BEARISH'
                  ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                  : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
              }`}
            >
              BIAS: {technical.bias}
            </span>
            {selectedInstrument.type === 'crypto' && (
              <span className="flex items-center gap-1 text-[9px] sm:text-[10px] font-mono px-1.5 sm:px-2 py-0.5 rounded bg-slate-800/80 text-slate-400 border border-slate-700">
                <Radio className={`w-3 h-3 ${isKlinesValidating ? 'animate-spin text-blue-400' : 'text-emerald-400'}`} />
                <span className="hidden sm:inline">BINANCE LIVE</span>
                <span className="sm:hidden">LIVE</span>
              </span>
            )}
          </div>

          <div className="h-5 w-px bg-slate-800 hidden sm:block" />

          {/* Current Live Price */}
          <div className="flex items-baseline gap-1.5 sm:gap-2">
            <span className="text-lg sm:text-xl md:text-2xl font-extrabold font-mono text-white tracking-tight">
              ${selectedInstrument.decimals > 2
                ? selectedInstrument.price.toFixed(selectedInstrument.decimals)
                : selectedInstrument.price.toLocaleString('en-US', {
                    minimumFractionDigits: selectedInstrument.decimals,
                    maximumFractionDigits: selectedInstrument.decimals,
                  })}
            </span>
            <span
              className={`flex items-center text-[10px] sm:text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                selectedInstrument.change24h >= 0
                  ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/30'
                  : 'text-rose-400 bg-rose-500/15 border border-rose-500/30'
              }`}
            >
              {selectedInstrument.change24h >= 0 ? '+' : ''}
              {selectedInstrument.change24h}%
            </span>
          </div>
        </div>

        {/* Right: 24h High, Low, Volume stats */}
        <div className="hidden lg:flex items-center gap-6 text-xs font-mono">
          <div>
            <div className="text-[10px] text-slate-400 uppercase">24h High</div>
            <div className="text-slate-200 font-semibold">
              ${selectedInstrument.decimals > 2
                ? selectedInstrument.high24h.toFixed(selectedInstrument.decimals)
                : selectedInstrument.high24h.toLocaleString('en-US')}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">24h Low</div>
            <div className="text-slate-200 font-semibold">
              ${selectedInstrument.decimals > 2
                ? selectedInstrument.low24h.toFixed(selectedInstrument.decimals)
                : selectedInstrument.low24h.toLocaleString('en-US')}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-slate-400 uppercase">24h Volume</div>
            <div className="text-blue-400 font-semibold">{selectedInstrument.volume24h}</div>
          </div>
        </div>
      </div>

      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-[#080C16] border-b border-slate-800/60 gap-2 text-xs">
        {/* Timeframe Selector (1m, 5m, 15m, 1h, 4h, 1d, 1w) */}
        <div className="flex items-center gap-0.5 sm:gap-1 p-0.5 rounded-lg bg-[#0F1524] border border-slate-800 overflow-x-auto max-w-full">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2 sm:px-2.5 py-1 rounded text-[11px] sm:text-xs font-mono font-medium transition-all shrink-0 ${
                timeframe === tf
                  ? 'bg-blue-600 text-white font-bold shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Chart Style & Indicators Switcher */}
        <div className="flex items-center gap-1">
          <div className="flex items-center p-0.5 rounded-lg bg-[#0F1524] border border-slate-800">
            <button
              onClick={() => setChartType('candlestick')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'candlestick' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Candlestick Chart"
            >
              <CandlestickChart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('line')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'line' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Line Chart"
            >
              <LineChart className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setChartType('area')}
              className={`p-1.5 rounded transition-colors ${
                chartType === 'area' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'
              }`}
              title="Area Chart"
            >
              <Layers className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Indicator Quick Toggles */}
          <div className="flex items-center gap-1.5 ml-2">
            <button
              onClick={() => setShowEMA20(!showEMA20)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                showEMA20
                  ? 'bg-blue-500/15 text-blue-400 border-blue-500/40 font-semibold'
                  : 'bg-[#0F1524] text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              EMA 20
            </button>
            <button
              onClick={() => setShowEMA50(!showEMA50)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                showEMA50
                  ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/40 font-semibold'
                  : 'bg-[#0F1524] text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              EMA 50
            </button>
            <button
              onClick={() => setShowVolume(!showVolume)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                showVolume
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/40 font-semibold'
                  : 'bg-[#0F1524] text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              Vol
            </button>
            <button
              onClick={() => setShowRSI(!showRSI)}
              className={`px-2 py-1 rounded text-[11px] font-mono border transition-all ${
                showRSI
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-semibold'
                  : 'bg-[#0F1524] text-slate-500 border-slate-800 hover:text-slate-300'
              }`}
            >
              RSI (14)
            </button>
          </div>
        </div>
      </div>

      {/* Hover OHLCV Meta Bar */}
      <div className="px-4 py-1.5 bg-[#0A0E1A]/80 border-b border-slate-800/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-slate-400">{activeDisplayBar?.time || 'Data Pasar'}</span>
          <span>
            O: <span className="text-white font-semibold">${activeDisplayBar?.open ?? selectedInstrument.price}</span>
          </span>
          <span>
            H: <span className="text-emerald-400 font-semibold">${activeDisplayBar?.high ?? selectedInstrument.high24h}</span>
          </span>
          <span>
            L: <span className="text-rose-400 font-semibold">${activeDisplayBar?.low ?? selectedInstrument.low24h}</span>
          </span>
          <span>
            C: <span className="text-white font-semibold">${activeDisplayBar?.close ?? selectedInstrument.price}</span>
          </span>
          {showVolume && activeDisplayBar?.volume !== undefined && (
            <span>
              Vol: <span className="text-blue-400 font-semibold">{activeDisplayBar.volume.toLocaleString()}</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[10px]">
          {showEMA20 && (
            <span className="text-sky-400 flex items-center gap-1">
              <span className="w-2 h-0.5 bg-sky-400 inline-block" />
              EMA20: ${activeDisplayBar?.ema20 ?? '--'}
            </span>
          )}
          {showEMA50 && (
            <span className="text-emerald-400 flex items-center gap-1">
              <span className="w-2 h-0.5 bg-emerald-400 inline-block" />
              EMA50: ${activeDisplayBar?.ema50 ?? '--'}
            </span>
          )}
        </div>
      </div>

      {/* Main Lightweight Charts Container */}
      <div className="relative w-full h-[340px] sm:h-[400px] lg:h-auto lg:flex-1 shrink-0 bg-[#06080F] overflow-hidden select-none">
        <div ref={chartContainerRef} className="w-full h-full touch-none select-none" />

        {/* RSI 14 Sub-indicator Pane (if toggled) */}
        {showRSI && (
          <div className="absolute bottom-2 left-4 right-20 h-14 bg-[#0B0F1C]/90 border border-slate-800 rounded p-1.5 flex flex-col justify-between backdrop-blur-md">
            <div className="flex items-center justify-between text-[10px] font-mono text-amber-400">
              <span className="font-bold">RSI (14): {currentRSI.toFixed(1)}</span>
              <span className="text-slate-400">
                {currentRSI >= 70 ? 'Overbought (>70)' : currentRSI <= 30 ? 'Oversold (<30)' : 'Neutral (30-70)'}
              </span>
            </div>
            <div className="h-3 w-full flex items-center">
              <div className="w-full h-1 bg-slate-800 rounded-full relative overflow-hidden">
                <div className="absolute left-0 right-0 top-0 bottom-0 bg-gradient-to-r from-emerald-500 via-amber-400 to-rose-500 opacity-60" />
                <div 
                  className="absolute top-[-3px] w-2.5 h-2.5 rounded-full bg-amber-400 border border-white/50 transition-all"
                  style={{ left: `${Math.min(98, Math.max(2, currentRSI))}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Scroll Indicator Helper */}
      <div className="lg:hidden flex items-center justify-between px-3 py-1 bg-[#0A0E1A]/80 border-y border-slate-800/80 text-[10px] font-mono text-slate-400 shrink-0">
        <span className="flex items-center gap-1.5 text-[#00F0FF]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00F0FF] animate-pulse" />
          <span className="font-semibold">Level Kunci, Sinyal & Matriks</span>
        </span>
        <span className="text-slate-400">↓ Gulir ke bawah</span>
      </div>

      {/* Bottom Sub-panel: Pure Technical Analysis & Multi-Pair Signal Screener */}
      <div className={`border-t border-slate-800/80 bg-[#090D18] flex flex-col transition-all duration-200 shrink-0 ${isBottomCollapsed ? 'h-9' : 'h-auto min-h-[300px] lg:h-64 sm:lg:h-72'} pb-14 lg:pb-0`}>
        {/* Sub-panel Tabs */}
        <div className="flex items-center justify-between px-2 sm:px-3 py-1 border-b border-slate-800/70 bg-[#0B0F1C] text-xs">
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar max-w-[85%] sm:max-w-none">
            <button
              onClick={() => {
                setActiveBottomTab('signals');
                if (isBottomCollapsed) setIsBottomCollapsed(false);
              }}
              className={`flex items-center gap-1 px-2 sm:px-3 py-1 rounded font-medium transition-colors shrink-0 ${
                activeBottomTab === 'signals' && !isBottomCollapsed
                  ? 'bg-slate-800 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">⚡ Sinyal</span>
              <span className="hidden sm:inline">Live Signal Screener</span>
              <span className="text-[10px] font-mono px-1 rounded-full bg-blue-500/20 text-blue-400">
                {marketSignals.length}
              </span>
            </button>
            <button
              onClick={() => {
                setActiveBottomTab('pivots');
                if (isBottomCollapsed) setIsBottomCollapsed(false);
              }}
              className={`px-2 sm:px-3 py-1 rounded font-medium transition-colors shrink-0 ${
                activeBottomTab === 'pivots' && !isBottomCollapsed
                  ? 'bg-slate-800 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">🎯 Level Kunci</span>
              <span className="hidden sm:inline">Level Kunci & Pivot</span>
            </button>
            <button
              onClick={() => {
                setActiveBottomTab('indicators');
                if (isBottomCollapsed) setIsBottomCollapsed(false);
              }}
              className={`px-2 sm:px-3 py-1 rounded font-medium transition-colors shrink-0 ${
                activeBottomTab === 'indicators' && !isBottomCollapsed
                  ? 'bg-slate-800 text-blue-400 border border-blue-500/30 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span className="sm:hidden">📊 Matriks TF</span>
              <span className="hidden sm:inline">Matriks Multi-Timeframe</span>
            </button>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-mono text-slate-400 hidden md:inline">
              {selectedInstrument.symbol}
            </span>
            <button
              onClick={() => setIsBottomCollapsed(!isBottomCollapsed)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors flex items-center gap-1 text-[10px] font-mono"
              title={isBottomCollapsed ? 'Buka Panel' : 'Minimalkan Panel'}
            >
              <span className="hidden sm:inline">{isBottomCollapsed ? 'Buka' : 'Tutup'}</span>
              {isBottomCollapsed ? <ChevronUp className="w-3.5 h-3.5 text-[#00F0FF]" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Tab 1: Live Signals Screener (Responsive Cards on Mobile / Table on Desktop) */}
        {!isBottomCollapsed && activeBottomTab === 'signals' && (
          <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
            {/* Mobile Card Layout (< sm screens) */}
            <div className="sm:hidden space-y-2">
              {marketSignals.map((sig) => {
                const isCurrent = sig.symbol === selectedInstrument.symbol;
                const isBull = sig.direction === 'BULLISH';
                return (
                  <div
                    key={sig.id}
                    className={`p-2.5 rounded-lg border transition-colors space-y-1.5 ${
                      isCurrent
                        ? 'bg-slate-800/90 border-blue-500/50'
                        : 'bg-[#0B0F1C] border-slate-800/80 hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-white text-xs">{sig.symbol}</span>
                        <span className="text-[9px] px-1 rounded bg-slate-800 text-slate-400">{sig.timeframe}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                            isBull
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : sig.direction === 'BEARISH'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {sig.direction}
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          const found = instruments.find((i) => i.id === sig.instrumentId);
                          if (found) onSelectInstrument(found);
                        }}
                        className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-400 border border-blue-500/40 text-[10px]"
                      >
                        {isCurrent ? 'Aktif' : 'Pilih'}
                      </button>
                    </div>

                    <div className="text-[10px] text-slate-300 font-sans truncate">{sig.setup}</div>

                    <div className="flex items-center justify-between text-[10px] bg-black/40 px-2 py-1 rounded">
                      <div>Masuk: <span className="text-slate-200 font-semibold">${sig.price}</span></div>
                      <div>Target TP: <span className="text-emerald-400 font-bold">${sig.targetPrice}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop Table Layout (>= sm screens) */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-7 text-[10px] uppercase text-slate-400 px-2 py-1 border-b border-slate-800/60">
                <span>Pair / Arah</span>
                <span>TF</span>
                <span className="col-span-2">Pola Setup</span>
                <span>Harga Masuk</span>
                <span>Target (TP)</span>
                <span className="text-right">Aksi</span>
              </div>
              <div className="space-y-1 mt-1">
                {marketSignals.map((sig) => {
                  const isCurrent = sig.symbol === selectedInstrument.symbol;
                  const isBull = sig.direction === 'BULLISH';
                  return (
                    <div
                      key={sig.id}
                      className={`grid grid-cols-7 items-center px-2 py-1.5 rounded border transition-colors ${
                        isCurrent
                          ? 'bg-slate-800/80 border-blue-500/40'
                          : 'bg-[#0B0F1C] border-slate-800/80 hover:bg-slate-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold">
                        <span className="text-white">{sig.symbol}</span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-mono ${
                            isBull
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : sig.direction === 'BEARISH'
                              ? 'bg-rose-500/20 text-rose-400'
                              : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {sig.direction}
                        </span>
                      </div>
                      <span className="text-slate-300 font-semibold">{sig.timeframe}</span>
                      <span className="col-span-2 text-slate-200 truncate pr-2">{sig.setup}</span>
                      <span className="text-slate-300">${sig.price}</span>
                      <span className="text-emerald-400 font-semibold">${sig.targetPrice}</span>
                      <div className="text-right">
                        <button
                          onClick={() => {
                            const found = instruments.find((i) => i.id === sig.instrumentId);
                            if (found) onSelectInstrument(found);
                          }}
                          className="px-2 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/30 hover:bg-blue-500/25 transition-colors text-[11px]"
                        >
                          {isCurrent ? 'Aktif' : 'Buka Pair'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Pivot Points Table (Level Kunci) */}
        {!isBottomCollapsed && activeBottomTab === 'pivots' && (
          <div className="flex-1 overflow-y-auto p-2 sm:p-3 text-xs font-mono">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
              <div className="space-y-1.5 bg-[#0B0F1C] p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block border-b border-slate-800/80 pb-1">
                  Zona Resistance (Jual / Take Profit)
                </span>
                <div className="flex justify-between text-rose-400">
                  <span>Resistance 3 (R3)</span>
                  <span className="font-semibold">${technical.r3}</span>
                </div>
                <div className="flex justify-between text-rose-400">
                  <span>Resistance 2 (R2)</span>
                  <span className="font-semibold">${technical.r2}</span>
                </div>
                <div className="flex justify-between text-rose-400/80">
                  <span>Resistance 1 (R1)</span>
                  <span>${technical.r1}</span>
                </div>
              </div>

              <div className="space-y-1.5 bg-[#0B0F1C] p-2.5 rounded border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block border-b border-slate-800/80 pb-1">
                  Pivot & Zona Support (Beli / Stop Loss)
                </span>
                <div className="flex justify-between text-blue-400 font-bold bg-slate-800/40 p-1 rounded">
                  <span>Pivot Point (P)</span>
                  <span>${technical.pivot}</span>
                </div>
                <div className="flex justify-between text-emerald-400/80">
                  <span>Support 1 (S1)</span>
                  <span>${technical.s1}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Support 2 (S2)</span>
                  <span className="font-semibold">${technical.s2}</span>
                </div>
                <div className="flex justify-between text-emerald-400">
                  <span>Support 3 (S3)</span>
                  <span className="font-semibold">${technical.s3}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Multi-Timeframe Matrix (Responsive Cards on Mobile / Table on Desktop) */}
        {!isBottomCollapsed && activeBottomTab === 'indicators' && (
          <div className="flex-1 overflow-y-auto p-2 text-xs font-mono">
            {/* Mobile Matrix Card Grid (< sm screens) */}
            <div className="sm:hidden grid grid-cols-2 gap-2">
              {tfMatrix.map((m) => (
                <div key={m.timeframe} className="p-2 bg-[#0B0F1C] rounded border border-slate-800 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-xs">{m.timeframe}</span>
                    <span
                      className={`text-[9px] font-bold px-1 rounded ${
                        m.trend === 'BULLISH'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : m.trend === 'BEARISH'
                          ? 'text-rose-400 bg-rose-500/10'
                          : 'text-amber-400 bg-amber-500/10'
                      }`}
                    >
                      {m.trend}
                    </span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>RSI:</span>
                    <span className="text-white font-semibold">{m.rsi}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>MACD:</span>
                    <span className={m.macd === 'POSITIVE' ? 'text-emerald-400 font-semibold' : m.macd === 'NEGATIVE' ? 'text-rose-400 font-semibold' : 'text-slate-300'}>{m.macd}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>Vol:</span>
                    <span className="text-slate-300">{m.volumeTrend}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop Table (>= sm screens) */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-5 text-[10px] uppercase text-slate-400 px-2 py-1 border-b border-slate-800/60">
                <span>Timeframe</span>
                <span>Tren Utama</span>
                <span>RSI (14)</span>
                <span>MACD Status</span>
                <span className="text-right">Volume Momentum</span>
              </div>
              <div className="space-y-1 mt-1">
                {tfMatrix.map((m) => (
                  <div
                    key={m.timeframe}
                    className="grid grid-cols-5 items-center px-2 py-1.5 bg-[#0B0F1C] rounded border border-slate-800 hover:bg-slate-800/40"
                  >
                    <span className="font-bold text-slate-200">{m.timeframe}</span>
                    <span
                      className={
                        m.trend === 'BULLISH'
                          ? 'text-emerald-400 font-bold'
                          : m.trend === 'BEARISH'
                          ? 'text-rose-400 font-bold'
                          : 'text-amber-400'
                      }
                    >
                      {m.trend}
                    </span>
                    <span className="text-slate-100">{m.rsi}</span>
                    <span
                      className={
                        m.macd === 'POSITIVE'
                          ? 'text-emerald-400'
                          : m.macd === 'NEGATIVE'
                          ? 'text-rose-400'
                          : 'text-slate-400'
                      }
                    >
                      {m.macd}
                    </span>
                    <span className="text-right text-slate-300">{m.volumeTrend}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};
