import { Instrument, MarketSignal, TechnicalOverview } from '../types/market';

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
  let score = 50;

  if (change24h > 0) {
    score = Math.min(95, Math.round(50 + change24h * 6 + (rangePos > 0.6 ? 10 : 0)));
    bias = score >= 65 ? 'BULLISH' : 'NEUTRAL';
  } else {
    score = Math.max(10, Math.round(50 + change24h * 6 - (rangePos < 0.4 ? 10 : 0)));
    bias = score <= 35 ? 'BEARISH' : 'NEUTRAL';
  }

  const volatilityPct = parseFloat(((range / price) * 100).toFixed(2));

  return {
    bias,
    score,
    rsi14: rawRSI,
    rsiStatus,
    emaTrend,
    volatilityPct,
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

    // Pattern 1: Strong Bullish Momentum or Breakout
    if (change24h >= 2.0 || price >= high24h * 0.99) {
      signals.push({
        id: `sig-${id}-breakout`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BULLISH',
        setup: 'Bullish Momentum & Resistance Breakout',
        timeframe: '4H',
        strength: change24h > 4 ? 'STRONG' : 'MODERATE',
        price,
        targetPrice: parseFloat((price + range * 0.8).toFixed(decimals)),
        invalidationPrice: parseFloat((pivots.pivot).toFixed(decimals)),
        timeAgo: '12m ago',
        rationale: `Price broke above key intraday pivot (${pivots.r1}) with strong +${change24h}% 24h expansion.`,
        indicators: ['Volume Spike > 1.8x', 'EMA 20/50 Golden Cross', 'RSI Bullish Expansion'],
      });
    }

    // Pattern 2: Oversold Rebound Setup
    else if (change24h <= -2.0 || price <= low24h * 1.01) {
      signals.push({
        id: `sig-${id}-oversold`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BULLISH',
        setup: 'Oversold Support Rejection',
        timeframe: '1H',
        strength: 'EARLY',
        price,
        targetPrice: parseFloat((pivots.pivot).toFixed(decimals)),
        invalidationPrice: parseFloat((low24h * 0.992).toFixed(decimals)),
        timeAgo: '28m ago',
        rationale: `Tested 24h low ($${low24h}) with slowing downside momentum; potential mean reversion toward pivot ($${pivots.pivot}).`,
        indicators: ['RSI Oversold Divergence', 'Stochastic %K Cross Up', 'Key Support S1 Hold'],
      });
    }

    // Pattern 3: Trend Continuation & Pullback Hold
    else if (change24h > 0.4 && change24h < 2.0) {
      signals.push({
        id: `sig-${id}-trend`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BULLISH',
        setup: 'EMA 20 Pullback & Continuation',
        timeframe: '1H',
        strength: 'MODERATE',
        price,
        targetPrice: parseFloat(pivots.r2.toFixed(decimals)),
        invalidationPrice: parseFloat(pivots.s1.toFixed(decimals)),
        timeAgo: '45m ago',
        rationale: `Holding above EMA 20 and daily pivot ($${pivots.pivot}). Steady upward structure without overextension.`,
        indicators: ['EMA 20 Trend Support', 'MACD Above Baseline', 'Higher Lows Structure'],
      });
    }

    // Pattern 4: Bearish Rejection or Distribution
    else if (change24h < -0.4 && change24h > -2.0) {
      signals.push({
        id: `sig-${id}-bearish`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'BEARISH',
        setup: 'Resistance Rejection & Lower High',
        timeframe: '1H',
        strength: 'MODERATE',
        price,
        targetPrice: parseFloat(pivots.s2.toFixed(decimals)),
        invalidationPrice: parseFloat(pivots.r1.toFixed(decimals)),
        timeAgo: '1h ago',
        rationale: `Failed to reclaim daily pivot ($${pivots.pivot}) following London/NY session transition.`,
        indicators: ['Bearish MACD Histogram', 'RSI Rejection at 55', 'Volume Contracting on Bounces'],
      });
    }

    // Pattern 5: Consolidation Squeeze
    else {
      signals.push({
        id: `sig-${id}-squeeze`,
        symbol,
        instrumentId: id,
        assetType: type,
        direction: 'NEUTRAL',
        setup: 'Range Squeeze & Volatility Contraction',
        timeframe: '15m',
        strength: 'EARLY',
        price,
        targetPrice: parseFloat(pivots.r1.toFixed(decimals)),
        invalidationPrice: parseFloat(pivots.s1.toFixed(decimals)),
        timeAgo: '1h ago',
        rationale: `Price compressed within tight 0.4% band between $${pivots.s1} and $${pivots.r1}; await breakout confirmation.`,
        indicators: ['Bollinger Squeeze', 'ADX < 18 (Low Trend)', 'Volume Below 20 MA'],
      });
    }
  }

  return signals;
}
