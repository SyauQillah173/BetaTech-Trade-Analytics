import { Instrument, Timeframe, OrderBookLevel, RecentTrade } from '../types/market';
import { generateCandleData, generateOrderBook, generateRecentTrades } from '../data/mockData';

export interface ChartCandle {
  time: number; // Unix timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface LiveTicker {
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
}

export const CRYPTO_CONFIGS: Record<string, { binanceSymbol: string; coingeckoId: string }> = {
  'btc-usd': { binanceSymbol: 'BTCUSDT', coingeckoId: 'bitcoin' },
  'eth-usd': { binanceSymbol: 'ETHUSDT', coingeckoId: 'ethereum' },
  'sol-usd': { binanceSymbol: 'SOLUSDT', coingeckoId: 'solana' },
  'bnb-usd': { binanceSymbol: 'BNBUSDT', coingeckoId: 'binancecoin' },
  'doge-usd': { binanceSymbol: 'DOGEUSDT', coingeckoId: 'dogecoin' },
  'xrp-usd': { binanceSymbol: 'XRPUSDT', coingeckoId: 'ripple' },
  'ada-usd': { binanceSymbol: 'ADAUSDT', coingeckoId: 'cardano' },
  'avax-usd': { binanceSymbol: 'AVAXUSDT', coingeckoId: 'avalanche-2' },
  'link-usd': { binanceSymbol: 'LINKUSDT', coingeckoId: 'chainlink' },
  'sui-usd': { binanceSymbol: 'SUIUSDT', coingeckoId: 'sui' },
};

export function resolveBinanceSymbol(instrument: { id?: string; symbol?: string; type?: string }): string | null {
  if (instrument.id && CRYPTO_CONFIGS[instrument.id]) {
    return CRYPTO_CONFIGS[instrument.id].binanceSymbol;
  }
  const sym = (instrument.symbol || '').toUpperCase();
  if (instrument.type === 'crypto' || sym.endsWith('/USD') || sym.endsWith('/USDT')) {
    const base = sym.split(/[-/_]/)[0];
    const nonCrypto = ['EUR', 'GBP', 'USD', 'JPY', 'AUD', 'CAD', 'CHF', 'NZD', 'XAU', 'XAG', 'WTI', 'CL'];
    if (base && !nonCrypto.includes(base)) {
      return `${base}USDT`;
    }
  }
  return null;
}

export function formatVolume(val: number): string {
  if (val >= 1e9) return `$${(val / 1e9).toFixed(1)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(1)}M`;
  if (val >= 1e3) return `$${(val / 1e3).toFixed(1)}K`;
  return `$${val.toFixed(0)}`;
}

// Fetch 24hr tickers for cryptos (Binance primary, CoinGecko fallback)
export async function fetchLiveCryptoTickers(): Promise<Record<string, LiveTicker>> {
  try {
    const symbols = Object.values(CRYPTO_CONFIGS).map(c => c.binanceSymbol);
    const url = `https://api.binance.com/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Binance ticker HTTP ${res.status}`);

    const rawList: Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    }> = await res.json();

    const result: Record<string, LiveTicker> = {};
    for (const [id, config] of Object.entries(CRYPTO_CONFIGS)) {
      const found = rawList.find(item => item.symbol === config.binanceSymbol);
      if (found) {
        result[id] = {
          price: parseFloat(found.lastPrice),
          change24h: parseFloat(parseFloat(found.priceChangePercent).toFixed(2)),
          high24h: parseFloat(found.highPrice),
          low24h: parseFloat(found.lowPrice),
          volume24h: formatVolume(parseFloat(found.quoteVolume)),
        };
      }
    }
    // Merge live Forex & Commodities tickers via /api/forex proxy (browser) or Yahoo Finance direct (server)
    try {
      const isBrowser = typeof window !== 'undefined';
      if (isBrowser) {
        const forexRes = await fetch('/api/forex?action=tickers', { cache: 'no-store' });
        if (forexRes.ok) {
          const data = await forexRes.json();
          if (data.tickers) {
            Object.assign(result, data.tickers);
          }
        }
      } else {
        // Server-side: fetch Yahoo Finance directly for each forex/commodity pair
        const FOREX_PAIRS: Record<string, { yahooSymbol: string; id: string; decimals: number; defaultVol: string }> = {
          'EUR/USD': { yahooSymbol: 'EURUSD=X', id: 'eur-usd', decimals: 4, defaultVol: '$118.5B' },
          'GBP/USD': { yahooSymbol: 'GBPUSD=X', id: 'gbp-usd', decimals: 4, defaultVol: '$82.4B' },
          'USD/JPY': { yahooSymbol: 'USDJPY=X', id: 'usd-jpy', decimals: 2, defaultVol: '$96.1B' },
          'AUD/USD': { yahooSymbol: 'AUDUSD=X', id: 'aud-usd', decimals: 4, defaultVol: '$46.8B' },
          'USD/CAD': { yahooSymbol: 'USDCAD=X', id: 'usd-cad', decimals: 4, defaultVol: '$38.2B' },
          'USD/CHF': { yahooSymbol: 'USDCHF=X', id: 'usd-chf', decimals: 4, defaultVol: '$29.5B' },
          'NZD/USD': { yahooSymbol: 'NZDUSD=X', id: 'nzd-usd', decimals: 4, defaultVol: '$24.1B' },
          'EUR/GBP': { yahooSymbol: 'EURGBP=X', id: 'eur-gbp', decimals: 4, defaultVol: '$16.3B' },
          'EUR/JPY': { yahooSymbol: 'EURJPY=X', id: 'eur-jpy', decimals: 2, defaultVol: '$22.7B' },
          'GBP/JPY': { yahooSymbol: 'GBPJPY=X', id: 'gbp-jpy', decimals: 2, defaultVol: '$18.5B' },
          'XAU/USD': { yahooSymbol: 'GC=F', id: 'xau-usd', decimals: 2, defaultVol: '$34.2B' },
          'XAG/USD': { yahooSymbol: 'SI=F', id: 'xag-usd', decimals: 3, defaultVol: '$8.4B' },
          'WTI/USD': { yahooSymbol: 'CL=F', id: 'wti-usd', decimals: 2, defaultVol: '$12.6B' },
        };
        await Promise.all(
          Object.values(FOREX_PAIRS).map(async (cfg) => {
            try {
              const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cfg.yahooSymbol}?interval=1h&range=1d`;
              const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
              if (res.ok) {
                const data = await res.json();
                const meta = data?.chart?.result?.[0]?.meta;
                if (meta && typeof meta.regularMarketPrice === 'number') {
                  result[cfg.id] = {
                    price: parseFloat(meta.regularMarketPrice.toFixed(cfg.decimals)),
                    change24h: parseFloat((meta.regularMarketChangePercent || meta.fulldayChangePercent || 0).toFixed(2)),
                    high24h: parseFloat((meta.regularMarketDayHigh || meta.regularMarketPrice * 1.005).toFixed(cfg.decimals)),
                    low24h: parseFloat((meta.regularMarketDayLow || meta.regularMarketPrice * 0.995).toFixed(cfg.decimals)),
                    volume24h: cfg.defaultVol,
                  };
                }
              }
            } catch {
              // Ignore single pair failure
            }
          })
        );
      }
    } catch {
      // Ignore forex failure
    }

    return result;
  } catch {
    // Fallback to CoinGecko Simple Price
    try {
      const ids = Object.values(CRYPTO_CONFIGS).map(c => c.coingeckoId).join(',');
      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_vol=true&include_24hr_change=true`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`CoinGecko HTTP ${res.status}`);

      const data: Record<string, { usd: number; usd_24h_vol: number; usd_24h_change: number }> = await res.json();
      const result: Record<string, LiveTicker> = {};

      for (const [id, config] of Object.entries(CRYPTO_CONFIGS)) {
        const item = data[config.coingeckoId];
        if (item) {
          result[id] = {
            price: item.usd,
            change24h: parseFloat(item.usd_24h_change.toFixed(2)),
            high24h: item.usd * 1.02,
            low24h: item.usd * 0.98,
            volume24h: formatVolume(item.usd_24h_vol),
          };
        }
      }
      return result;
    } catch {
      return {};
    }
  }
}

// Fetch Klines (Candlesticks) from Binance / Yahoo Finance with fallback to generated data
export async function fetchKlines(
  instrument: Instrument,
  timeframe: Timeframe,
  limit: number = 100
): Promise<ChartCandle[]> {
  const binanceSymbol = resolveBinanceSymbol(instrument);

  if (binanceSymbol) {
    try {
      const tfMap: Record<Timeframe, string> = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d',
        '1w': '1w',
      };
      const interval = tfMap[timeframe] || '1h';
      const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Binance klines HTTP ${res.status}`);

      const rawKlines: Array<[number, string, string, string, string, string]> = await res.json();
      
      const map = new Map<number, ChartCandle>();
      for (const k of rawKlines) {
        const timeSec = Math.floor(Number(k[0]) / 1000);
        map.set(timeSec, {
          time: timeSec,
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        });
      }
      return Array.from(map.values()).sort((a, b) => a.time - b.time);
    } catch {
      // Proceed to fallback generator
    }
  }

  // 2. Jika Forex atau Komoditas, ambil candlestick riil dari API /api/forex
  if (instrument.type === 'forex' || instrument.type === 'commodities') {
    try {
      const isBrowser = typeof window !== 'undefined';
      const url = isBrowser
        ? `/api/forex?symbol=${encodeURIComponent(instrument.symbol)}&timeframe=${timeframe}&limit=${limit}`
        : null;

      if (url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (res.ok) {
          const data = await res.json();
          if (data.candles && Array.isArray(data.candles) && data.candles.length > 0) {
            return data.candles;
          }
        }
      }
    } catch {
      // Proceed to fallback generator
    }
  }

  // Fallback for Forex / Commodities or offline: mock generator with ascending UTC timestamps
  const rawCandles = generateCandleData(instrument.price, timeframe, limit);
  const tfSeconds: Record<Timeframe, number> = {
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '1h': 3600,
    '4h': 14400,
    '1d': 86400,
    '1w': 604800,
  };
  const step = tfSeconds[timeframe] || 3600;
  const now = Math.floor(Date.now() / 1000);
  const startTime = now - rawCandles.length * step;

  const map = new Map<number, ChartCandle>();
  rawCandles.forEach((c, idx) => {
    const time = startTime + idx * step;
    map.set(time, {
      time,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    });
  });

  return Array.from(map.values()).sort((a, b) => a.time - b.time);
}

// Fetch Order Book (bids & asks)
export async function fetchOrderBook(
  instrument: Instrument
): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }> {
  const binanceSymbol = resolveBinanceSymbol(instrument);
  if (binanceSymbol) {
    try {
      const url = `https://api.binance.com/api/v3/depth?symbol=${binanceSymbol}&limit=8`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Binance depth HTTP ${res.status}`);

      const data: { bids: [string, string][]; asks: [string, string][] } = await res.json();
      
      let runningBidTotal = 0;
      const bids: OrderBookLevel[] = data.bids.slice(0, 6).map(([p, s]) => {
        const price = parseFloat(p);
        const size = parseFloat(s);
        runningBidTotal += size;
        return {
          price,
          size: parseFloat(size.toFixed(4)),
          total: parseFloat(runningBidTotal.toFixed(3)),
          depthPct: Math.min(100, Math.max(10, Math.round((size / (runningBidTotal || 1)) * 100))),
        };
      });

      let runningAskTotal = 0;
      const asks: OrderBookLevel[] = data.asks.slice(0, 6).map(([p, s]) => {
        const price = parseFloat(p);
        const size = parseFloat(s);
        runningAskTotal += size;
        return {
          price,
          size: parseFloat(size.toFixed(4)),
          total: parseFloat(runningAskTotal.toFixed(3)),
          depthPct: Math.min(100, Math.max(10, Math.round((size / (runningAskTotal || 1)) * 100))),
        };
      });

      return { bids, asks };
    } catch {
      // fallback
    }
  }

  return generateOrderBook(instrument.price, instrument.decimals);
}

// Fetch Recent Trades
export async function fetchRecentTrades(
  instrument: Instrument
): Promise<RecentTrade[]> {
  const binanceSymbol = resolveBinanceSymbol(instrument);
  if (binanceSymbol) {
    try {
      const url = `https://api.binance.com/api/v3/trades?symbol=${binanceSymbol}&limit=12`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Binance trades HTTP ${res.status}`);

      const data: Array<{
        id: number;
        price: string;
        qty: string;
        time: number;
        isBuyerMaker: boolean;
      }> = await res.json();

      return data.reverse().map(t => {
        const d = new Date(t.time);
        const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        return {
          id: String(t.id),
          price: parseFloat(t.price),
          size: parseFloat(parseFloat(t.qty).toFixed(4)),
          time,
          side: t.isBuyerMaker ? 'sell' : 'buy',
        };
      });
    } catch {
      // fallback
    }
  }

  return generateRecentTrades(instrument.price, instrument.decimals);
}

// Resolve a real 24h ticker for an arbitrary instrument (crypto via Binance, forex/commodity via /api/forex)
export async function fetchLiveTickerFor(instrument: Instrument): Promise<LiveTicker | null> {
  const binanceSymbol = resolveBinanceSymbol(instrument);
  if (binanceSymbol) {
    try {
      const url = `https://api.binance.com/api/v3/ticker/24hr?symbol=${binanceSymbol}`;
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) return null;
      const t: {
        lastPrice: string;
        priceChangePercent: string;
        highPrice: string;
        lowPrice: string;
        quoteVolume: string;
      } = await res.json();
      return {
        price: parseFloat(t.lastPrice),
        change24h: parseFloat(parseFloat(t.priceChangePercent).toFixed(2)),
        high24h: parseFloat(t.highPrice),
        low24h: parseFloat(t.lowPrice),
        volume24h: formatVolume(parseFloat(t.quoteVolume)),
      };
    } catch {
      return null;
    }
  }

  if (instrument.type === 'forex' || instrument.type === 'commodities') {
    try {
      const res = await fetch('/api/forex?action=tickers', { cache: 'no-store' });
      if (!res.ok) return null;
      const data: { tickers?: Record<string, LiveTicker> } = await res.json();
      return data.tickers?.[instrument.id] ?? null;
    } catch {
      return null;
    }
  }

  return null;
}

// EMA indicator calculation
export function calculateEMA(data: ChartCandle[], period: number): Array<{ time: number; value: number }> {
  if (data.length < period) return [];
  const k = 2 / (period + 1);
  let ema = data.slice(0, period).reduce((sum, d) => sum + d.close, 0) / period;
  const result: Array<{ time: number; value: number }> = [];

  for (let i = period - 1; i < data.length; i++) {
    if (i === period - 1) {
      result.push({ time: data[i].time, value: parseFloat(ema.toFixed(4)) });
    } else {
      ema = data[i].close * k + ema * (1 - k);
      result.push({ time: data[i].time, value: parseFloat(ema.toFixed(4)) });
    }
  }
  return result;
}

// RSI indicator calculation
export function calculateRSI(data: ChartCandle[], period: number = 14): Array<{ time: number; value: number }> {
  if (data.length <= period) return [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = data[i].close - data[i - 1].close;
    if (diff >= 0) gains += diff;
    else losses -= diff;
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;
  const result: Array<{ time: number; value: number }> = [];

  const initialRs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  result.push({
    time: data[period].time,
    value: parseFloat((100 - 100 / (1 + initialRs)).toFixed(2)),
  });

  for (let i = period + 1; i < data.length; i++) {
    const diff = data[i].close - data[i - 1].close;
    const gain = diff > 0 ? diff : 0;
    const loss = diff < 0 ? -diff : 0;

    avgGain = (avgGain * (period - 1) + gain) / period;
    avgLoss = (avgLoss * (period - 1) + loss) / period;

    const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    result.push({
      time: data[i].time,
      value: parseFloat((100 - 100 / (1 + rs)).toFixed(2)),
    });
  }

  return result;
}
