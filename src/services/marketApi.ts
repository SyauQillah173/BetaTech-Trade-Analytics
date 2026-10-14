import { Instrument, Timeframe, OrderBookLevel, RecentTrade } from '../types/market';

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

export const CRYPTO_CONFIGS: Record<string, { binanceSymbol: string; coingeckoId: string; yahooSymbol: string }> = {
  'btc-usd': { binanceSymbol: 'BTCUSDT', coingeckoId: 'bitcoin', yahooSymbol: 'BTC-USD' },
  'eth-usd': { binanceSymbol: 'ETHUSDT', coingeckoId: 'ethereum', yahooSymbol: 'ETH-USD' },
  'sol-usd': { binanceSymbol: 'SOLUSDT', coingeckoId: 'solana', yahooSymbol: 'SOL-USD' },
  'bnb-usd': { binanceSymbol: 'BNBUSDT', coingeckoId: 'binancecoin', yahooSymbol: 'BNB-USD' },
  'doge-usd': { binanceSymbol: 'DOGEUSDT', coingeckoId: 'dogecoin', yahooSymbol: 'DOGE-USD' },
  'xrp-usd': { binanceSymbol: 'XRPUSDT', coingeckoId: 'ripple', yahooSymbol: 'XRP-USD' },
  'ada-usd': { binanceSymbol: 'ADAUSDT', coingeckoId: 'cardano', yahooSymbol: 'ADA-USD' },
  'avax-usd': { binanceSymbol: 'AVAXUSDT', coingeckoId: 'avalanche-2', yahooSymbol: 'AVAX-USD' },
  'link-usd': { binanceSymbol: 'LINKUSDT', coingeckoId: 'chainlink', yahooSymbol: 'LINK-USD' },
  'sui-usd': { binanceSymbol: 'SUIUSDT', coingeckoId: 'sui', yahooSymbol: 'SUI-USD' },
};

// api.binance.com is geo-blocked from some regions (HTTP 000); the public data
// mirror serves the same REST surface, so try it first and keep the original as fallback.
const BINANCE_HOSTS = [
  'https://data-api.binance.vision',
  'https://api.binance.com',
];

// Fetch a Binance REST path, failing over across hosts. Returns null when every host is unreachable.
export async function fetchBinance(path: string): Promise<unknown | null> {
  for (const host of BINANCE_HOSTS) {
    try {
      const res = await fetch(`${host}${path}`, { cache: 'no-store' });
      if (res.ok) return await res.json();
    } catch {
      // try next host
    }
  }
  return null;
}

// Fetch candles for any Yahoo-symbol from Yahoo Finance (crypto + forex/commodity fallback)
export async function fetchYahooKlines(
  yahooSymbol: string,
  timeframe: Timeframe,
  limit: number
): Promise<ChartCandle[]> {
  const tfMap: Record<Timeframe, { interval: string; range: string }> = {
    '1m': { interval: '1m', range: '1d' },
    '5m': { interval: '5m', range: '1d' },
    '15m': { interval: '15m', range: '5d' },
    '1h': { interval: '1h', range: '1mo' },
    '4h': { interval: '1h', range: '3mo' },
    '1d': { interval: '1d', range: '1y' },
    '1w': { interval: '1wk', range: '2y' },
  };
  const { interval, range } = tfMap[timeframe] || tfMap['1h'];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result?.timestamp) return [];

    const q = result.indicators?.quote?.[0] || {};
    const candles: ChartCandle[] = [];
    for (let i = 0; i < result.timestamp.length; i++) {
      const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
      if (o == null || h == null || l == null || c == null) continue;
      candles.push({
        time: result.timestamp[i],
        open: o,
        high: h,
        low: l,
        close: c,
        volume: q.volume?.[i] ?? 0,
      });
    }
    // 4h is built from 1h bars: group consecutive bars into 4-bar buckets
    const out = timeframe === '4h' ? groupCandles(candles, 4) : candles;
    return out.slice(-limit);
  } catch {
    return [];
  }
}

// Aggregate N consecutive candles into one OHLCV bar
function groupCandles(candles: ChartCandle[], size: number): ChartCandle[] {
  const out: ChartCandle[] = [];
  for (let i = 0; i < candles.length; i += size) {
    const chunk = candles.slice(i, i + size);
    if (!chunk.length) continue;
    out.push({
      time: chunk[0].time,
      open: chunk[0].open,
      high: Math.max(...chunk.map((c) => c.high)),
      low: Math.min(...chunk.map((c) => c.low)),
      close: chunk[chunk.length - 1].close,
      volume: chunk.reduce((sum, c) => sum + c.volume, 0),
    });
  }
  return out;
}

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
    const path = `/api/v3/ticker/24hr?symbols=${encodeURIComponent(JSON.stringify(symbols))}`;
    const rawList = await fetchBinance(path) as Array<{
      symbol: string;
      lastPrice: string;
      priceChangePercent: string;
      highPrice: string;
      lowPrice: string;
      quoteVolume: string;
    }> | null;
    if (!rawList) throw new Error('Binance ticker unreachable on all hosts');

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
    // Fallback: Yahoo Finance crypto quotes (Binance mirror and CoinGecko can both be unreachable/rate-limited)
    const result: Record<string, LiveTicker> = {};
    await Promise.all(
      Object.entries(CRYPTO_CONFIGS).map(async ([id, config]) => {
        try {
          const url = `https://query1.finance.yahoo.com/v8/finance/chart/${config.yahooSymbol}?interval=1h&range=1d`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
          if (!res.ok) return;
          const meta = (await res.json())?.chart?.result?.[0]?.meta;
          if (!meta || typeof meta.regularMarketPrice !== 'number') return;
          result[id] = {
            price: meta.regularMarketPrice,
            change24h: parseFloat((meta.regularMarketChangePercent || meta.fulldayChangePercent || 0).toFixed(2)),
            high24h: meta.regularMarketDayHigh || meta.regularMarketPrice * 1.02,
            low24h: meta.regularMarketDayLow || meta.regularMarketPrice * 0.98,
            volume24h: meta.regularMarketVolume ? formatVolume(meta.regularMarketVolume) : '--',
          };
        } catch {
          // ignore single pair
        }
      })
    );
    return result;
  }
}

// Yahoo symbols for forex & commodity instruments (mirrors the /api/forex route map)
const YAHOO_FOREX_MAP: Record<string, string> = {
  'EUR/USD': 'EURUSD=X', 'GBP/USD': 'GBPUSD=X', 'USD/JPY': 'USDJPY=X', 'AUD/USD': 'AUDUSD=X',
  'USD/CAD': 'USDCAD=X', 'USD/CHF': 'USDCHF=X', 'NZD/USD': 'NZDUSD=X', 'EUR/GBP': 'EURGBP=X',
  'EUR/JPY': 'EURJPY=X', 'GBP/JPY': 'GBPJPY=X', 'XAU/USD': 'GC=F', 'XAG/USD': 'SI=F', 'WTI/USD': 'CL=F',
};

// Server-side forex/commodity candles (the /api/forex route is browser-only)
export async function fetchYahooForexKlines(
  symbol: string,
  timeframe: Timeframe,
  limit: number
): Promise<ChartCandle[]> {
  const clean = symbol.toUpperCase().trim();
  const yahooSymbol = YAHOO_FOREX_MAP[clean]
    || (clean.includes('/') ? `${clean.replace('/', '')}=X` : `${clean}=X`);
  return fetchYahooKlines(yahooSymbol, timeframe, limit);
}

// Fetch Klines (Candlesticks). Real market data only — Binance mirror -> Yahoo.
// Never synthesises candles: a fabricated series would silently drive the ICT engine on fake structure.
export async function fetchKlines(
  instrument: Instrument,
  timeframe: Timeframe,
  limit: number = 100
): Promise<ChartCandle[]> {
  // 1. Crypto via Binance (host failover)
  const binanceSymbol = resolveBinanceSymbol(instrument);
  if (binanceSymbol) {
    const tfMap: Record<Timeframe, string> = {
      '1m': '1m', '5m': '5m', '15m': '15m', '1h': '1h', '4h': '4h', '1d': '1d', '1w': '1w',
    };
    const interval = tfMap[timeframe] || '1h';
    const raw = await fetchBinance(`/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`) as
      Array<[number, string, string, string, string, string]> | null;
    if (raw && Array.isArray(raw) && raw.length) {
      return raw
        .map((k) => ({
          time: Math.floor(Number(k[0]) / 1000),
          open: parseFloat(k[1]),
          high: parseFloat(k[2]),
          low: parseFloat(k[3]),
          close: parseFloat(k[4]),
          volume: parseFloat(k[5]),
        }))
        .sort((a, b) => a.time - b.time);
    }
    // 2. Crypto fallback: Yahoo Finance
    const cfg = instrument.id ? CRYPTO_CONFIGS[instrument.id] : undefined;
    if (cfg) {
      const yahoo = await fetchYahooKlines(cfg.yahooSymbol, timeframe, limit);
      if (yahoo.length) return yahoo;
    }
  }

  // 3. Forex & commodities via the Yahoo-backed /api/forex proxy
  if (instrument.type === 'forex' || instrument.type === 'commodities') {
    if (typeof window !== 'undefined') {
      try {
        const res = await fetch(
          `/api/forex?symbol=${encodeURIComponent(instrument.symbol)}&timeframe=${timeframe}&limit=${limit}`,
          { cache: 'no-store' }
        );
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.candles) && data.candles.length > 0) return data.candles;
        }
      } catch {
        // fall through to empty
      }
    } else {
      // Server-side (SSR): call the same route logic via its Yahoo helper
      const yahoo = await fetchYahooForexKlines(instrument.symbol, timeframe, limit);
      if (yahoo.length) return yahoo;
    }
  }

  // No real data available: return empty so the chart shows an explicit empty state
  // instead of a synthetic series that would look like live structure.
  return [];
}

// Fetch Order Book (bids & asks)
export async function fetchOrderBook(
  instrument: Instrument
): Promise<{ bids: OrderBookLevel[]; asks: OrderBookLevel[] }> {
  const binanceSymbol = resolveBinanceSymbol(instrument);
  if (binanceSymbol) {
    try {
      const data = await fetchBinance(`/api/v3/depth?symbol=${binanceSymbol}&limit=8`) as
        { bids: [string, string][]; asks: [string, string][] } | null;
      if (!data) throw new Error('Binance depth unreachable on all hosts');
      
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

  // No depth feed available: empty book instead of a fabricated one.
  return { bids: [], asks: [] };
}

// Fetch Recent Trades
export async function fetchRecentTrades(
  instrument: Instrument
): Promise<RecentTrade[]> {
  const binanceSymbol = resolveBinanceSymbol(instrument);
  if (binanceSymbol) {
    try {
      const data = await fetchBinance(`/api/v3/trades?symbol=${binanceSymbol}&limit=12`) as Array<{
        id: number;
        price: string;
        qty: string;
        time: number;
        isBuyerMaker: boolean;
      }> | null;
      if (!data) throw new Error('Binance trades unreachable on all hosts');

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

  // No trade feed available: empty list instead of fabricated prints.
  return [];
}

// Resolve a real 24h ticker for an arbitrary instrument (crypto via Binance, forex/commodity via /api/forex)
export async function fetchLiveTickerFor(instrument: Instrument): Promise<LiveTicker | null> {
  const binanceSymbol = resolveBinanceSymbol(instrument);
  if (binanceSymbol) {
    try {
      const t = await fetchBinance(`/api/v3/ticker/24hr?symbol=${binanceSymbol}`) as {
        lastPrice: string;
        priceChangePercent: string;
        highPrice: string;
        lowPrice: string;
        quoteVolume: string;
      } | null;
      if (!t) return null;
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
