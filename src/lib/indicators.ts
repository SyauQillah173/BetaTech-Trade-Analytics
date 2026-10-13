import { CandleData } from '../types/market';
import { generateICTMasterAnalysis, ICTConfluenceReport } from './ictEngine';

/**
 * Institutional-Grade Technical Indicator Suite
 * BetaTech Trade Analytics Engine
 */

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
  trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
}

export interface BollingerResult {
  upper: number;
  middle: number;
  lower: number;
  percentB: number;
}

export interface TechnicalAnalysisResult {
  rsi: number;
  rsiStatus: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL';
  maShort: number; // EMA 20
  maLong: number;  // EMA 50
  ma200: number;   // EMA 200 or longest available EMA
  trend: string;
  macd: MacdResult;
  atr: number;
  bollinger: BollingerResult;
  support: number;
  resistance: number;
  confluenceScore: number; // -100 to +100
  recommendedSignal: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio: number;
  reason: string;
  currentPrice: number;
  ict?: ICTConfluenceReport;
}

/**
 * Calculate Relative Strength Index (RSI 14) with Wilder's Smoothing
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

  if (avgLoss === 0) return 100.0;
  const rs = avgGain / avgLoss;
  const rsi = 100 - 100 / (1 + rs);
  return parseFloat(Math.min(100, Math.max(0, rsi)).toFixed(1));
}

/**
 * Calculate Exponential Moving Average (EMA) with proper SMA seed
 */
export function calculateEMA(closes: number[], period: number): number {
  if (closes.length === 0) return 0;
  if (closes.length < period) {
    const sum = closes.reduce((acc, val) => acc + val, 0);
    return parseFloat((sum / closes.length).toFixed(4));
  }

  const k = 2 / (period + 1);
  const seedSlice = closes.slice(0, period);
  let ema = seedSlice.reduce((sum, val) => sum + val, 0) / period;

  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }

  return parseFloat(ema.toFixed(4));
}

/**
 * Calculate full array of EMA values
 */
function calculateEMASeries(closes: number[], period: number): number[] {
  if (closes.length < period) return closes.map(() => closes[0] || 0);

  const k = 2 / (period + 1);
  const result: number[] = new Array(closes.length).fill(0);
  let seed = 0;
  for (let i = 0; i < period; i++) seed += closes[i];
  seed /= period;

  for (let i = 0; i < period; i++) result[i] = seed;

  let currentEma = seed;
  for (let i = period; i < closes.length; i++) {
    currentEma = closes[i] * k + currentEma * (1 - k);
    result[i] = currentEma;
  }

  return result;
}

/**
 * Moving Average Convergence Divergence (MACD 12, 26, 9)
 */
export function calculateMACD(
  closes: number[],
  fastPeriod: number = 12,
  slowPeriod: number = 26,
  signalPeriod: number = 9
): MacdResult {
  if (closes.length < slowPeriod) {
    return { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL' };
  }

  const fastEma = calculateEMASeries(closes, fastPeriod);
  const slowEma = calculateEMASeries(closes, slowPeriod);

  const macdLine: number[] = [];
  for (let i = 0; i < closes.length; i++) {
    macdLine.push(fastEma[i] - slowEma[i]);
  }

  const signalLine = calculateEMASeries(macdLine, signalPeriod);

  const lastMacd = macdLine[macdLine.length - 1];
  const lastSignal = signalLine[signalLine.length - 1];
  const histogram = lastMacd - lastSignal;
  const prevHistogram = macdLine.length > 1
    ? (macdLine[macdLine.length - 2] - signalLine[signalLine.length - 2])
    : histogram;

  let trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  if (histogram > 0) {
    trend = histogram >= prevHistogram ? 'BULLISH' : 'NEUTRAL';
  } else if (histogram < 0) {
    trend = histogram <= prevHistogram ? 'BEARISH' : 'NEUTRAL';
  }

  const decimals = Math.abs(lastMacd) < 1 ? 4 : 2;

  return {
    macd: parseFloat(lastMacd.toFixed(decimals)),
    signal: parseFloat(lastSignal.toFixed(decimals)),
    histogram: parseFloat(histogram.toFixed(decimals)),
    trend,
  };
}

/**
 * Average True Range (ATR 14) for volatility-anchored risk management
 */
export function calculateATR(candles: CandleData[], period: number = 14): number {
  if (!candles || candles.length < 2) return 0;

  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const cur = candles[i];
    const prev = candles[i - 1];
    const tr = Math.max(
      cur.high - cur.low,
      Math.abs(cur.high - prev.close),
      Math.abs(cur.low - prev.close)
    );
    trs.push(tr);
  }

  if (trs.length === 0) return 0;
  if (trs.length < period) {
    const sum = trs.reduce((a, b) => a + b, 0);
    return parseFloat((sum / trs.length).toFixed(4));
  }

  let atr = trs.slice(0, period).reduce((a, b) => a + b, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }

  return parseFloat(atr.toFixed(4));
}

/**
 * Bollinger Bands (20, 2)
 */
export function calculateBollingerBands(
  closes: number[],
  period: number = 20,
  stdDevMultiplier: number = 2
): BollingerResult {
  if (closes.length < period) {
    const last = closes[closes.length - 1] || 0;
    return { upper: last, middle: last, lower: last, percentB: 0.5 };
  }

  const slice = closes.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / period;
  const variance = slice.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / period;
  const stdDev = Math.sqrt(variance);

  const upper = mean + stdDevMultiplier * stdDev;
  const lower = mean - stdDevMultiplier * stdDev;
  const current = closes[closes.length - 1];
  const percentB = upper === lower ? 0.5 : (current - lower) / (upper - lower);

  const decimals = current < 10 ? 4 : 2;

  return {
    upper: parseFloat(upper.toFixed(decimals)),
    middle: parseFloat(mean.toFixed(decimals)),
    lower: parseFloat(lower.toFixed(decimals)),
    percentB: parseFloat(Math.min(1.5, Math.max(-0.5, percentB)).toFixed(2)),
  };
}

/**
 * Comprehensive institutional technical indicator analysis for OHLCV data
 */
export function analyzeTechnicalIndicators(
  candles: CandleData[],
  forcedDecimals?: number
): TechnicalAnalysisResult {
  if (!candles || candles.length === 0) {
    return {
      rsi: 50.0,
      rsiStatus: 'NEUTRAL',
      maShort: 0,
      maLong: 0,
      ma200: 0,
      trend: 'Sideways',
      macd: { macd: 0, signal: 0, histogram: 0, trend: 'NEUTRAL' },
      atr: 0,
      bollinger: { upper: 0, middle: 0, lower: 0, percentB: 0.5 },
      support: 0,
      resistance: 0,
      confluenceScore: 0,
      recommendedSignal: 'WAIT',
      confidence: 60,
      targetPrice: 0,
      stopLoss: 0,
      riskRewardRatio: 1.0,
      reason: 'Data pasar tidak mencukupi untuk analisis kuantitatif.',
      currentPrice: 0,
    };
  }

  const closes = candles.map((c) => c.close);
  const currentPrice = closes[closes.length - 1];
  const decimals = forcedDecimals ?? (currentPrice < 10 ? 4 : 2);
  const roundVal = (v: number) => parseFloat(v.toFixed(decimals));

  // 1. Indikator Inti
  const rsi = calculateRSI(closes, 14);
  const maShort = roundVal(calculateEMA(closes, 20)); // EMA 20
  const maLong = roundVal(calculateEMA(closes, 50));  // EMA 50
  const ma200 = roundVal(calculateEMA(closes, Math.min(200, Math.max(50, closes.length)))); // EMA 200

  const macd = calculateMACD(closes);
  const atr = calculateATR(candles, 14);
  const bollinger = calculateBollingerBands(closes, 20, 2);

  // 2. Support & Resistance Swing (20 bars terakhir)
  const windowBars = candles.slice(-24);
  const recentHighs = windowBars.map((c) => c.high);
  const recentLows = windowBars.map((c) => c.low);
  const resistance = roundVal(Math.max(...recentHighs));
  const support = roundVal(Math.min(...recentLows));

  // 3. Status RSI
  let rsiStatus: 'OVERSOLD' | 'OVERBOUGHT' | 'NEUTRAL' = 'NEUTRAL';
  if (rsi <= 32) rsiStatus = 'OVERSOLD';
  else if (rsi >= 68) rsiStatus = 'OVERBOUGHT';

  // 4. Struktur Tren Moving Average
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

  // 5. Quantitative Confluence Scoring Matrix (-100 .. +100)
  let confluenceScore = 0;

  // Faktor 1: Struktur EMA (Bobot: 30)
  if (currentPrice > maShort && maShort > maLong) {
    confluenceScore += 30;
  } else if (currentPrice > maShort && maShort <= maLong) {
    confluenceScore += 15;
  } else if (currentPrice < maShort && maShort < maLong) {
    confluenceScore -= 30;
  } else if (currentPrice < maShort && maShort >= maLong) {
    confluenceScore -= 15;
  }

  // Faktor 2: Momentum RSI (Bobot: 25)
  if (rsi < 30) {
    confluenceScore += 25; // Oversold rebound
  } else if (rsi >= 30 && rsi < 45) {
    confluenceScore += 15; // Recovery zone
  } else if (rsi > 55 && rsi <= 68) {
    confluenceScore += 10; // Healthy bullish momentum
  } else if (rsi > 68 && rsi < 78) {
    confluenceScore -= 15; // Late cycle / extended
  } else if (rsi >= 78) {
    confluenceScore -= 25; // Severe overbought exhaustion
  }

  // Faktor 3: Momentum MACD (Bobot: 25)
  if (macd.histogram > 0) {
    confluenceScore += macd.trend === 'BULLISH' ? 25 : 12;
  } else if (macd.histogram < 0) {
    confluenceScore -= macd.trend === 'BEARISH' ? 25 : 12;
  }

  // Faktor 4: Posisi Bollinger Bands (Bobot: 20)
  if (bollinger.percentB <= 0.15) {
    confluenceScore += 20; // Support band discount
  } else if (bollinger.percentB >= 0.85) {
    confluenceScore -= 20; // Resistance band premium
  }

  confluenceScore = Math.max(-100, Math.min(100, confluenceScore));

  // 6. Master ICT Smart Money Concepts Analysis (79Trades Curriculum)
  const ict = generateICTMasterAnalysis(candles, decimals);

  // Keputusan Sinyal Akhir & Confidence dengan Filter ICT Anti-Stop Loss
  let recommendedSignal: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let confidence = 65;
  let stopLoss = 0;
  let targetPrice = 0;
  let riskRewardRatio = 2.0;
  let reason = '';

  const effectiveAtr = atr > 0 ? atr : currentPrice * 0.015;

  // Skenario 1: ICT Menyarankan WAIT (Chop / No Liquidity / Dilarang Buy di Premium / Dilarang Sell di Diskon)
  if (ict.smartMoneySignal === 'WAIT') {
    recommendedSignal = 'WAIT';
    confidence = Math.min(75, Math.max(50, ict.confidence));
    stopLoss = roundVal(ict.suggestedStopLoss || support);
    targetPrice = roundVal(ict.suggestedTP1 || resistance);
    riskRewardRatio = 1.0;
    reason = `[FILTER ANTI-SL: ${ict.setupName}] ${ict.rationale}`;
  }
  // Skenario 2: Konfluensi BUY (Indikator Bullish + ICT Diskon & Daily Bias)
  else if (ict.smartMoneySignal === 'BUY' && confluenceScore >= 10) {
    recommendedSignal = 'BUY';
    confidence = Math.min(96, Math.max(76, Math.round(ict.confidence * (confluenceScore >= 35 ? 1.05 : 0.98))));
    stopLoss = roundVal(ict.suggestedStopLoss);
    targetPrice = roundVal(ict.suggestedTP1);
    riskRewardRatio = ict.riskRewardRatio;

    const sessionTag = ict.killzone.isKillzone ? `⚡ ${ict.killzone.sessionName}` : ict.killzone.sessionName;
    reason = `[${sessionTag} | ${ict.setupName}] Daily Bias ${ict.dailyBias.bias} (${ict.dailyBias.biasModel}). Berada di ${ict.premiumDiscount.currentZone} (${ict.premiumDiscount.discountPct}% range). SL institusional aman di $${stopLoss} (di bawah invalidasi low). Target ERL High $${targetPrice} (R:R 1:${riskRewardRatio}).`;
  }
  // Skenario 3: Konfluensi SELL (Indikator Bearish + ICT Premium & Daily Bias)
  else if (ict.smartMoneySignal === 'SELL' && confluenceScore <= -10) {
    recommendedSignal = 'SELL';
    confidence = Math.min(96, Math.max(76, Math.round(ict.confidence * (confluenceScore <= -35 ? 1.05 : 0.98))));
    stopLoss = roundVal(ict.suggestedStopLoss);
    targetPrice = roundVal(ict.suggestedTP1);
    riskRewardRatio = ict.riskRewardRatio;

    const sessionTag = ict.killzone.isKillzone ? `⚡ ${ict.killzone.sessionName}` : ict.killzone.sessionName;
    reason = `[${sessionTag} | ${ict.setupName}] Daily Bias ${ict.dailyBias.bias} (${ict.dailyBias.biasModel}). Berada di ${ict.premiumDiscount.currentZone} (${ict.premiumDiscount.discountPct}% range). SL institusional aman di $${stopLoss} (di atas invalidasi high). Target ERL Low $${targetPrice} (R:R 1:${riskRewardRatio}).`;
  }
  // Skenario 4: Sinyal Bertentangan (Indikator vs ICT) -> Lindungi Modal (WAIT)
  else {
    recommendedSignal = 'WAIT';
    confidence = 60;
    stopLoss = roundVal(support);
    targetPrice = roundVal(resistance);
    riskRewardRatio = 1.0;
    reason = `[KONSOLIDASI / WAIT] Indikator teknikal (${confluenceScore >= 0 ? 'Bullish' : 'Bearish'}) bertentangan dengan struktur ICT (${ict.dailyBias.bias} di ${ict.premiumDiscount.currentZone}). Menunggu konfirmasi arah yang lebih bersih untuk menghindari false breakout.`;
  }

  return {
    rsi,
    rsiStatus,
    maShort,
    maLong,
    ma200,
    trend,
    macd,
    atr: roundVal(effectiveAtr),
    bollinger,
    support,
    resistance,
    confluenceScore,
    recommendedSignal,
    confidence,
    targetPrice,
    stopLoss,
    riskRewardRatio,
    reason,
    currentPrice,
    ict,
  };
}
