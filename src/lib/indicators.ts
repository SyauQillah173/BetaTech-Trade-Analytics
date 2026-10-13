import { CandleData } from '../types/market';

/**
 * Calculate Relative Strength Index (RSI 14)
 */
export function calculateRSI(closes: number[], period: number = 14): number {
  if (closes.length < period + 1) return 50.0;

  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      gains += diff;
    } else {
      losses += Math.abs(diff);
    }
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Smoothed RSI for the remaining bars
  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return parseFloat(rsi.toFixed(1));
}

/**
 * Calculate Exponential Moving Average (EMA)
 */
export function calculateEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  if (closes.length < period) {
    const sum = closes.reduce((acc, val) => acc + val, 0);
    return parseFloat((sum / closes.length).toFixed(4));
  }

  const k = 2 / (period + 1);
  let ema = closes[0];

  for (let i = 1; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return parseFloat(ema.toFixed(4));
}

/**
 * Comprehensive technical indicator analysis for OHLCV data
 */
export function analyzeTechnicalIndicators(candles: CandleData[]) {
  if (!candles || candles.length === 0) {
    return {
      rsi: 50.0,
      maShort: 0,
      maLong: 0,
      trend: 'Sideways',
      support: 0,
      resistance: 0,
      currentPrice: 0,
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const rsi = calculateRSI(closes, 14);
  const maShort = calculateEMA(closes, 20); // MA 20
  const maLong = calculateEMA(closes, 50); // MA 50

  // Recent support & resistance from lows and highs
  const recentHighs = candles.slice(-20).map((c) => c.high);
  const recentLows = candles.slice(-20).map((c) => c.low);
  const resistance = Math.max(...recentHighs);
  const support = Math.min(...recentLows);

  // Trend determination based on Price vs MA20 and MA20 vs MA50
  let trend = 'Konsolidasi / Sideways';
  if (currentPrice > maShort && maShort > maLong) {
    trend = 'Strong Bullish (Uptrend)';
  } else if (currentPrice > maShort && maShort <= maLong) {
    trend = 'Bullish Reversal / Golden Cross Attempt';
  } else if (currentPrice < maShort && maShort < maLong) {
    trend = 'Strong Bearish (Downtrend)';
  } else if (currentPrice < maShort && maShort >= maLong) {
    trend = 'Bearish Pullback / Death Cross Attempt';
  }

  return {
    rsi,
    maShort,
    maLong,
    trend,
    support,
    resistance,
    currentPrice,
  };
}
