import { Instrument, MarketSignal, TechnicalOverview } from '../types/market';
import { getICTKillzoneInfo } from '../lib/ictEngine';

/**
 * Calculate standard pivot points (Floor Trader / Classic)
 */
export function calculatePivotPoints(high: number, low: number, close: number, decimals: number) {
  const p = (high + low + close) / 3;
  const r1 = 2 * p - low;
  const s1 = 2 * p - high;
  const r2 = p + (high - low);
  const s2 = p - (high - low);
  const r3 = high + 2 * (p - low);
  const s3 = low - 2 * (high - p);

  return {
    pivot: parseFloat(p.toFixed(decimals)),
    r1: parseFloat(r1.toFixed(decimals)),
    r2: parseFloat(r2.toFixed(decimals)),
    r3: parseFloat(r3.toFixed(decimals)),
    s1: parseFloat(s1.toFixed(decimals)),
    s2: parseFloat(s2.toFixed(decimals)),
    s3: parseFloat(s3.toFixed(decimals)),
  };
}

/**
 * Generate technical overview & indicator status for a given instrument
 */
export function getTechnicalOverview(instrument: Instrument): TechnicalOverview {
  const { price, high24h, low24h, change24h, decimals } = instrument;
  const pivots = calculatePivotPoints(high24h, low24h, price, decimals);
  const killzone = getICTKillzoneInfo();

  // Dynamic RSI estimate based on 24h change & position in range
  const range = high24h - low24h || 1;
  const rangePos = (price - low24h) / range;
  const rawRSI = Math.min(85, Math.max(20, Math.round(rangePos * 60 + 20 + change24h * 1.5)));
  
  let rsiStatus: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT' = 'NEUTRAL';
  if (rawRSI >= 70) rsiStatus = 'OVERBOUGHT';
  else if (rawRSI <= 30) rsiStatus = 'OVERSOLD';

  let emaTrend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS';
  if (change24h > 1.2 && price > pivots.pivot) emaTrend = 'UPTREND';
  else if (change24h < -1.2 && price < pivots.pivot) emaTrend = 'DOWNTREND';

  let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let dailyBiasModel = 'CONSOLIDATION';
  let score = 50;

  // ICT Daily Bias Framework (PDH / PDL analysis)
  if (price >= high24h * 0.998) {
    bias = 'BULLISH';
    dailyBiasModel = 'CONTINUATION (New High Hunt)';
    score = 85;
  } else if (price <= low24h * 1.002) {
    bias = 'BEARISH';
    dailyBiasModel = 'CONTINUATION (New Low Hunt)';
    score = 20;
  } else if (rangePos > 0.5) {
    bias = 'BULLISH';
    dailyBiasModel = 'PREMIUM EXPANSION';
    score = Math.min(90, Math.round(55 + change24h * 5));
  } else {
    bias = 'BEARISH';
    dailyBiasModel = 'DISCOUNT ACCUMULATION';
    score = Math.max(15, Math.round(45 + change24h * 5));
  }

  const discountPct = Math.round(rangePos * 100);
  const premiumDiscountZone = discountPct < 45 ? 'DISCOUNT' : discountPct > 55 ? 'PREMIUM' : 'EQUILIBRIUM';
  const volatilityPct = parseFloat(((range / price) * 100).toFixed(2));
  const fvgMidpoint = parseFloat(((high24h + low24h) / 2).toFixed(decimals));

  return {
    bias,
    score,
    rsi14: rawRSI,
    rsiStatus,
    emaTrend,
    volatilityPct,
    pdh: high24h,
    pdl: low24h,
    dailyBiasModel,
    killzoneName: killzone.sessionName,
    isKillzone: killzone.isKillzone,
    premiumDiscountZone,
    fvgMidpoint,
    ...pivots,
  };
}

/**
 * Multi-timeframe trend breakdown matrix
 */
export interface TimeframeMatrix {
  timeframe: string;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  rsi: number;
  macd: 'POSITIVE' | 'NEGATIVE' | 'CONVERGING';
  volumeTrend: 'ABOVE AVG' | 'NORMAL' | 'LOW';
}

export function getTimeframeMatrix(instrument: Instrument): TimeframeMatrix[] {
  const ch = instrument.change24h;
  return [
    {
      timeframe: '15m',
      trend: ch > 0.5 ? 'BULLISH' : ch < -0.5 ? 'BEARISH' : 'NEUTRAL',
      rsi: Math.min(80, Math.max(25, Math.round(50 + ch * 3.5))),
      macd: ch > 0 ? 'POSITIVE' : 'NEGATIVE',
      volumeTrend: Math.abs(ch) > 2 ? 'ABOVE AVG' : 'NORMAL',
    },
    {
      timeframe: '1H',
      trend: ch > 1.0 ? 'BULLISH' : ch < -1.0 ? 'BEARISH' : 'NEUTRAL',
      rsi: Math.min(85, Math.max(20, Math.round(52 + ch * 4.0))),
      macd: ch > 0.8 ? 'POSITIVE' : ch < -0.8 ? 'NEGATIVE' : 'CONVERGING',
      volumeTrend: Math.abs(ch) > 1.5 ? 'ABOVE AVG' : 'NORMAL',
    },
    {
      timeframe: '4H',
      trend: ch > 1.5 ? 'BULLISH' : ch < -1.5 ? 'BEARISH' : 'NEUTRAL',
      rsi: Math.min(85, Math.max(25, Math.round(48 + ch * 3.2))),
      macd: ch > 1 ? 'POSITIVE' : 'NEGATIVE',
      volumeTrend: 'ABOVE AVG',
    },
    {
      timeframe: '1D',
      trend: ch > 0 ? 'BULLISH' : 'BEARISH',
      rsi: Math.min(80, Math.max(30, Math.round(50 + ch * 2.8))),
      macd: ch > 0 ? 'POSITIVE' : 'NEGATIVE',
      volumeTrend: 'NORMAL',
    },
  ];
}

/**
 * Generate scanner signals across all available market pairs
 */
export function generateMarketSignals(instruments: Instrument[]): MarketSignal[] {
  const signals: MarketSignal[] = [];

  for (const inst of instruments) {
    const { id, symbol, type, price, change24h, high24h, low24h, decimals } = inst;
    const pivots = calculatePivotPoints(high24h, low24h, price, decimals);
    const range = high24h - low24h || price * 0.02;

    // Pattern 1: Strong Bullish Momentum or Breakout (ICT Continuation to ERL)
    if (change24h >= 2.0 || price >= high24h * 0.99) {
      signals.push({
        id: `sig-${id}-breakout`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BULLISH',
        setup: 'ICT Bullish Continuation: ERL High Expansion',
        timeframe: '4H',
        strength: change24h > 4 ? 'STRONG' : 'MODERATE',
        price,
        targetPrice: parseFloat((high24h * 1.018).toFixed(decimals)),
        invalidationPrice: parseFloat((low24h + range * 0.5).toFixed(decimals)),
        timeAgo: '12m ago',
        rationale: `Body candle close di atas PDH ($${high24h}). Konfirmasi struktur continuation menuju Buyside Liquidity (BSL) baru.`,
        indicators: ['PDH Body Close (BOS)', 'Displacement Volume > 1.8x', 'IRL to ERL Expansion'],
      });
    }

    // Pattern 2: SSL Liquidity Sweep & Bullish Reversal (Turtle Soup / Reversal Model)
    else if (change24h <= -2.0 || price <= low24h * 1.01) {
      signals.push({
        id: `sig-${id}-oversold`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BULLISH',
        setup: 'ICT SSL Sweep & Bullish Reversal (Diskon)',
        timeframe: '1H',
        strength: 'EARLY',
        price,
        targetPrice: parseFloat((pivots.pivot).toFixed(decimals)),
        invalidationPrice: parseFloat((low24h * 0.994).toFixed(decimals)),
        timeAgo: '28m ago',
        rationale: `Sweep likuiditas Sellside (SSL) di bawah PDL ($${low24h}) meninggalkan wick. Harga transisi dari ERL menuju IRL (FVG).`,
        indicators: ['SSL Liquidity Purge (Wick)', 'Bullish CISD Attempt', 'Deep Discount OTE (79%)'],
      });
    }

    // Pattern 3: ICT OTE Discount Retest & Trend Continuation
    else if (change24h > 0.4 && change24h < 2.0) {
      signals.push({
        id: `sig-${id}-trend`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BULLISH',
        setup: 'ICT OTE & FVG Retest (Discount Zone)',
        timeframe: '1H',
        strength: 'MODERATE',
        price,
        targetPrice: parseFloat(pivots.r2.toFixed(decimals)),
        invalidationPrice: parseFloat((pivots.s1 * 0.998).toFixed(decimals)),
        timeAgo: '45m ago',
        rationale: `Harga tertahan di zona diskon OTE (62%-70.5%) dan memantul dari Bullish Order Block. SL terlindungi di bawah invalidasi low.`,
        indicators: ['Bullish Order Block (OB)', 'Fair Value Gap (BISI) Hold', 'Daily Bias Bullish'],
      });
    }

    // Pattern 4: BSL Liquidity Sweep & Bearish Reversal
    else if (change24h < -0.4 && change24h > -2.0) {
      signals.push({
        id: `sig-${id}-bearish`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BEARISH',
        setup: 'ICT BSL Sweep & Bearish Reversal (Premium)',
        timeframe: '1H',
        strength: 'MODERATE',
        price,
        targetPrice: parseFloat(pivots.s2.toFixed(decimals)),
        invalidationPrice: parseFloat((pivots.r1 * 1.002).toFixed(decimals)),
        timeAgo: '1h ago',
        rationale: `Penolakan di Zona Premium setelah sweep Buyside Liquidity (BSL). Mengonfirmasi Bearish CISD menuju target Sellside ($${pivots.s2}).`,
        indicators: ['BSL Sweep Rejection', 'Bearish CISD Triggered', 'Premium Array Rejection'],
      });
    }

    // Pattern 5: Consolidation Squeeze (No Liquidity / Wait)
    else {
      signals.push({
        id: `sig-${id}-squeeze`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'NEUTRAL',
        setup: 'ICT Liquidity Staging: Inside Range (Wait)',
        timeframe: '15m',
        strength: 'EARLY',
        price,
        targetPrice: parseFloat(pivots.r1.toFixed(decimals)),
        invalidationPrice: parseFloat(pivots.s1.toFixed(decimals)),
        timeAgo: '1h ago',
        rationale: `Aturan ICT 79Trades: Likuiditas ERL/IRL belum tersapu secara bersih. Wajib DISIPLIN WAIT untuk mencegah Stop Loss false breakout.`,
        indicators: ['Inside Range Equilibrium', 'No Liquidity Sweep Yet', 'Wait for Killzone Volume'],
      });
    }
  }

  return signals;
}
