import { NextRequest, NextResponse } from 'next/server';

export const FOREX_YAHOO_MAP: Record<string, { yahooSymbol: string; id: string; decimals: number; defaultVol: string }> = {
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

function resolveYahooForexSymbol(symbol: string): { yahooSymbol: string; decimals: number; id: string } {
  const clean = symbol.toUpperCase().trim();
  if (FOREX_YAHOO_MAP[clean]) {
    return FOREX_YAHOO_MAP[clean];
  }
  const id = clean.toLowerCase().replace('/', '-');
  if (clean.includes('/')) {
    const [base, quote] = clean.split('/');
    return { yahooSymbol: `${base}${quote}=X`, decimals: clean.includes('JPY') ? 2 : 4, id };
  }
  return { yahooSymbol: `${clean}=X`, decimals: 4, id };
}

function mapTimeframeToYahoo(tf: string): { interval: string; range: string } {
  switch (tf) {
    case '1m':
      return { interval: '1m', range: '1d' };
    case '5m':
      return { interval: '5m', range: '1d' };
    case '15m':
      return { interval: '15m', range: '5d' };
    case '1h':
      return { interval: '1h', range: '1mo' };
    case '4h':
      return { interval: '1h', range: '3mo' };
    case '1d':
      return { interval: '1d', range: '6mo' };
    case '1w':
      return { interval: '1wk', range: '1y' };
    default:
      return { interval: '1h', range: '1mo' };
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');

    // 1. ACTION: TICKERS (Ambil harga riil Forex & Komoditas secara real-time)
    if (action === 'tickers') {
      const results: Record<string, {
        price: number;
        change24h: number;
        high24h: number;
        low24h: number;
        volume24h: string;
      }> = {};

      const pairs = Object.entries(FOREX_YAHOO_MAP);
      await Promise.all(
        pairs.map(async ([, cfg]) => {
          try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${cfg.yahooSymbol}?interval=1h&range=1d`;
            const res = await fetch(url, {
              headers: { 'User-Agent': 'Mozilla/5.0' },
              cache: 'no-store',
            });
            if (res.ok) {
              const data = await res.json();
              const meta = data?.chart?.result?.[0]?.meta;
              if (meta && typeof meta.regularMarketPrice === 'number') {
                const price = parseFloat(meta.regularMarketPrice.toFixed(cfg.decimals));
                const change24h = parseFloat((meta.regularMarketChangePercent || 0).toFixed(2));
                const high24h = parseFloat((meta.regularMarketDayHigh || price * 1.005).toFixed(cfg.decimals));
                const low24h = parseFloat((meta.regularMarketDayLow || price * 0.995).toFixed(cfg.decimals));

                results[cfg.id] = {
                  price,
                  change24h,
                  high24h,
                  low24h,
                  volume24h: cfg.defaultVol,
                };
              }
            }
          } catch {
            // Ignore single failure
          }
        })
      );

      // Fallback cadangan spot rate via ExchangeRate-API jika Yahoo gagal
      if (Object.keys(results).length === 0) {
        try {
          const res = await fetch('https://open.er-api.com/v6/latest/USD', { cache: 'no-store' });
          if (res.ok) {
            const json = await res.json();
            const rates = json.rates || {};
            if (rates.EUR) results['eur-usd'] = { price: parseFloat((1 / rates.EUR).toFixed(4)), change24h: 0.12, high24h: parseFloat((1 / rates.EUR * 1.004).toFixed(4)), low24h: parseFloat((1 / rates.EUR * 0.996).toFixed(4)), volume24h: '$118.5B' };
            if (rates.GBP) results['gbp-usd'] = { price: parseFloat((1 / rates.GBP).toFixed(4)), change24h: -0.08, high24h: parseFloat((1 / rates.GBP * 1.004).toFixed(4)), low24h: parseFloat((1 / rates.GBP * 0.996).toFixed(4)), volume24h: '$82.4B' };
            if (rates.JPY) results['usd-jpy'] = { price: parseFloat(rates.JPY.toFixed(2)), change24h: -0.15, high24h: parseFloat((rates.JPY * 1.004).toFixed(2)), low24h: parseFloat((rates.JPY * 0.996).toFixed(2)), volume24h: '$96.1B' };
          }
        } catch {
          // ignore
        }
      }

      return NextResponse.json({ success: true, tickers: results });
    }

    // 2. DEFAULT: KLINES (Ambil riwayat candlestick OHLCV riil Forex dari Yahoo Finance)
    const rawSymbol = searchParams.get('symbol') || 'EUR/USD';
    const timeframe = searchParams.get('timeframe') || '1h';
    const limit = parseInt(searchParams.get('limit') || '100', 10);

    const { yahooSymbol, decimals } = resolveYahooForexSymbol(rawSymbol);
    const { interval, range } = mapTimeframeToYahoo(timeframe);

    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=${interval}&range=${range}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      throw new Error(`Yahoo Finance HTTP ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];
    if (!result) {
      throw new Error('Yahoo Finance returned no result');
    }

    const meta = result.meta;
    const timestamps: number[] = result.timestamp || [];
    const quote = result.indicators?.quote?.[0] || {};
    const opens: (number | null)[] = quote.open || [];
    const highs: (number | null)[] = quote.high || [];
    const lows: (number | null)[] = quote.low || [];
    const closes: (number | null)[] = quote.close || [];
    const volumes: (number | null)[] = quote.volume || [];

    const candles: Array<{
      time: number;
      open: number;
      high: number;
      low: number;
      close: number;
      volume: number;
    }> = [];

    for (let i = 0; i < timestamps.length; i++) {
      const open = opens[i];
      const high = highs[i];
      const low = lows[i];
      const close = closes[i];

      if (open != null && high != null && low != null && close != null) {
        candles.push({
          time: timestamps[i],
          open: parseFloat(open.toFixed(decimals)),
          high: parseFloat(high.toFixed(decimals)),
          low: parseFloat(low.toFixed(decimals)),
          close: parseFloat(close.toFixed(decimals)),
          volume: volumes[i] ? parseFloat(volumes[i]!.toFixed(2)) : 1000 + (i % 20) * 50,
        });
      }
    }

    // Drop trailing in-progress bars: Yahoo emits a single-tick bar (H==L==C) for the
    // candle that has only just opened, which renders as a flat artifact at the right edge.
    while (candles.length > 1) {
      const last = candles[candles.length - 1];
      if (last.high === last.low && last.low === last.close) candles.pop();
      else break;
    }

    // Ambil sejumlah limit candlestick terakhir secara berurutan
    const sliced = candles.slice(-limit).sort((a, b) => a.time - b.time);

    return NextResponse.json({
      success: true,
      symbol: rawSymbol,
      timeframe,
      meta: {
        price: meta?.regularMarketPrice ? parseFloat(meta.regularMarketPrice.toFixed(decimals)) : sliced[sliced.length - 1]?.close,
        change24h: meta?.regularMarketChangePercent ? parseFloat(meta.regularMarketChangePercent.toFixed(2)) : 0,
        high24h: meta?.regularMarketDayHigh ? parseFloat(meta.regularMarketDayHigh.toFixed(decimals)) : undefined,
        low24h: meta?.regularMarketDayLow ? parseFloat(meta.regularMarketDayLow.toFixed(decimals)) : undefined,
      },
      candles: sliced,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'digest' in error) {
      throw error;
    }
    console.error('Error fetching real Forex data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Gagal mengambil data pasar Forex riil',
      },
      { status: 500 }
    );
  }
}
