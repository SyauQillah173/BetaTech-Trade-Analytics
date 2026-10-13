import { CandleData } from '../types/market';

/**
 * ============================================================================
 * BETATECH SMART MONEY CONCEPTS (SMC) & ICT ALGORITHMIC QUANTITATIVE ENGINE
 * Berdasarkan 5 Buku Kurikulum 79Trades / 79FX:
 * 1. ICT Killzones, Macros & Silver Bullet Time Windows
 * 2. Daily Bias (PDH / PDL Continuation vs Reversal Sweep)
 * 3. Basic Konsep ICT (Market Structure Shift, Order Block, FVG, OTE 62%-79%)
 * 4. CISD Model (Change in the State of Delivery)
 * 5. IRL & ERL (Internal & External Range Liquidity Cycle)
 * ============================================================================
 */

export interface ICTKillzoneInfo {
  currentNYTime: string; // HH:mm:ss in NY (UTC-4)
  sessionName: string;
  isKillzone: boolean;
  killzoneType: 'LONDON_OPEN' | 'NY_AM' | 'LONDON_CLOSE' | 'ASIA' | 'NY_PM' | 'NONE';
  isSilverBullet: boolean;
  silverBulletWindow?: 'LONDON (03:00-04:00)' | 'NY_AM (10:00-11:00)' | 'NY_PM (13:00-15:00)';
  isMacro: boolean;
  macroWindow?: '08:50-09:10' | '09:50-10:10' | '10:50-11:10';
  isLunchHour: boolean; // 12:00 - 13:00 NY (Chop zone)
  qualityMultiplier: number; // 1.25x saat Killzone/SilverBullet, 0.75x saat Asia/Lunch
}

export interface DailyBiasResult {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  biasModel: 'CONTINUATION' | 'REVERSAL_SWEEP' | 'CONSOLIDATION';
  pdh: number; // Previous Day's High
  pdl: number; // Previous Day's Low
  pdhSwept: boolean;
  pdlSwept: boolean;
  pdhClosedAbove: boolean;
  pdlClosedBelow: boolean;
  narrative: string;
}

export interface FVGLevel {
  type: 'BULLISH_BISI' | 'BEARISH_SIBI';
  top: number;
  bottom: number;
  midpoint: number; // Consequent Encroachment (50% FVG)
  time: string;
  isMitigated: boolean;
}

export interface OrderBlockLevel {
  type: 'BULLISH_OB' | 'BEARISH_OB';
  high: number;
  low: number;
  open: number;
  close: number;
  time: string;
  isMitigated: boolean;
}

export interface PremiumDiscountResult {
  rangeHigh: number;
  rangeLow: number;
  equilibrium: number; // 50%
  ote62: number;       // 62% retracement
  ote705: number;      // 70.5% sweet spot
  ote79: number;       // 79% deep discount/premium
  currentZone: 'DEEP_DISCOUNT' | 'DISCOUNT' | 'EQUILIBRIUM' | 'PREMIUM' | 'DEEP_PREMIUM';
  discountPct: number; // 0 - 100% position within range
  isOptimalForBuy: boolean;
  isOptimalForSell: boolean;
}

export interface IRL_ERL_Analysis {
  erlHigh: number; // Buyside Liquidity (BSL / Old High / PDH)
  erlLow: number;  // Sellside Liquidity (SSL / Old Low / PDL)
  activeIRL: FVGLevel | null; // Nearest unmitigated FVG
  cycleState: 'EXPANDING_TO_ERL' | 'RETRACING_TO_IRL' | 'LIQUIDITY_SWEPT_REVERSING' | 'NO_STRUCTURE';
  nextTargetType: 'ERL_BUYSIDE' | 'ERL_SELLSIDE' | 'IRL_FAIR_VALUE_GAP';
  targetPrice: number;
  noTradeCondition: boolean; // "Jika tidak ada Internal & External Range Liquidity = NO TRADE"
  reason: string;
}

export interface CISDResult {
  hasCISD: boolean;
  type: 'BULLISH_CISD' | 'BEARISH_CISD' | 'NONE';
  triggerPrice: number;
  status: string;
}

export interface ICTConfluenceReport {
  killzone: ICTKillzoneInfo;
  dailyBias: DailyBiasResult;
  fvgList: FVGLevel[];
  activeFVG: FVGLevel | null;
  orderBlocks: OrderBlockLevel[];
  activeOB: OrderBlockLevel | null;
  premiumDiscount: PremiumDiscountResult;
  irlErl: IRL_ERL_Analysis;
  cisd: CISDResult;
  smartMoneySignal: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  suggestedEntry: number;
  suggestedStopLoss: number;
  suggestedTP1: number;
  suggestedTP2: number;
  riskRewardRatio: number;
  setupName: string;
  rationale: string;
}

/**
 * 1. ICT KILLZONES, MACROS & SILVER BULLET TIMING CALCULATION
 * Mengonversi waktu sekarang ke waktu New York (EDT/EST, UTC-4 standar forex ICT)
 */
export function getICTKillzoneInfo(dateInput?: Date): ICTKillzoneInfo {
  // Cegah prerender error Next.js pada SSR Client Component dengan waktu stabil saat typeof window === 'undefined'
  const date = dateInput ?? (typeof window === 'undefined' ? new Date(1730000000000) : new Date());
  // Hitung jam di New York (UTC-4)
  const utcHours = date.getUTCHours();
  const utcMinutes = date.getUTCMinutes();
  const utcSeconds = date.getUTCSeconds();

  // New York time (UTC - 4)
  let nyHours = utcHours - 4;
  if (nyHours < 0) nyHours += 24;

  const nyTotalMinutes = nyHours * 60 + utcMinutes;
  const currentNYTime = `${String(nyHours).padStart(2, '0')}:${String(utcMinutes).padStart(2, '0')}:${String(utcSeconds).padStart(2, '0')}`;

  // Time boundaries in NY Total Minutes
  // Forex Killzones:
  // Asia: 22:00 - 00:00 (1320 - 1440)
  // London: 02:00 - 05:00 (120 - 300)
  // NY AM: 07:00 - 10:00 (420 - 600)
  // London Close: 10:00 - 12:00 (600 - 720)
  // NY Lunch: 12:00 - 13:00 (720 - 780)
  // NY PM: 13:00 - 16:00 (780 - 960)

  let sessionName = 'Off-Hours Session';
  let isKillzone = false;
  let killzoneType: ICTKillzoneInfo['killzoneType'] = 'NONE';
  let isSilverBullet = false;
  let silverBulletWindow: ICTKillzoneInfo['silverBulletWindow'] = undefined;
  let isMacro = false;
  let macroWindow: ICTKillzoneInfo['macroWindow'] = undefined;
  let isLunchHour = false;
  let qualityMultiplier = 0.85;

  // London Open Killzone (02:00 - 05:00 NY)
  if (nyTotalMinutes >= 120 && nyTotalMinutes < 300) {
    sessionName = 'London Open Killzone';
    isKillzone = true;
    killzoneType = 'LONDON_OPEN';
    qualityMultiplier = 1.25;

    // London Silver Bullet (03:00 - 04:00 NY)
    if (nyTotalMinutes >= 180 && nyTotalMinutes < 240) {
      isSilverBullet = true;
      silverBulletWindow = 'LONDON (03:00-04:00)';
      qualityMultiplier = 1.35;
    }
  }
  // New York AM Killzone (07:00 - 10:00 NY)
  else if (nyTotalMinutes >= 420 && nyTotalMinutes < 600) {
    sessionName = 'New York AM Killzone';
    isKillzone = true;
    killzoneType = 'NY_AM';
    qualityMultiplier = 1.3;

    // NY AM Macros
    if (nyTotalMinutes >= 530 && nyTotalMinutes <= 550) {
      isMacro = true;
      macroWindow = '08:50-09:10';
    } else if (nyTotalMinutes >= 590 && nyTotalMinutes <= 610) {
      isMacro = true;
      macroWindow = '09:50-10:10';
    }
  }
  // London Close & NY Silver Bullet Window (10:00 - 12:00 NY)
  else if (nyTotalMinutes >= 600 && nyTotalMinutes < 720) {
    sessionName = 'London Close Killzone';
    isKillzone = true;
    killzoneType = 'LONDON_CLOSE';
    qualityMultiplier = 1.2;

    // NY AM Silver Bullet (10:00 - 11:00 NY)
    if (nyTotalMinutes >= 600 && nyTotalMinutes < 660) {
      isSilverBullet = true;
      silverBulletWindow = 'NY_AM (10:00-11:00)';
      qualityMultiplier = 1.35;
    }
    // Macro 10:50 - 11:10
    if (nyTotalMinutes >= 650 && nyTotalMinutes <= 670) {
      isMacro = true;
      macroWindow = '10:50-11:10';
    }
  }
  // NY Lunch (12:00 - 13:00 NY) -> Hindari entry agresif (banyak retail SL kena)
  else if (nyTotalMinutes >= 720 && nyTotalMinutes < 780) {
    sessionName = 'New York Lunch Hour (Chop Risk)';
    isLunchHour = true;
    qualityMultiplier = 0.65;
  }
  // NY PM Session & PM Silver Bullet (13:00 - 16:00 NY)
  else if (nyTotalMinutes >= 780 && nyTotalMinutes < 960) {
    sessionName = 'New York PM Session';
    killzoneType = 'NY_PM';
    qualityMultiplier = 1.15;

    // NY PM Silver Bullet (13:00 - 15:00 NY)
    if (nyTotalMinutes >= 780 && nyTotalMinutes < 900) {
      isSilverBullet = true;
      silverBulletWindow = 'NY_PM (13:00-15:00)';
      qualityMultiplier = 1.3;
    }
  }
  // Asia Session (22:00 - 00:00 NY)
  else if (nyTotalMinutes >= 1320 || nyTotalMinutes < 120) {
    sessionName = 'Asian Range Session';
    killzoneType = 'ASIA';
    qualityMultiplier = 0.8;
  }

  return {
    currentNYTime,
    sessionName,
    isKillzone,
    killzoneType,
    isSilverBullet,
    silverBulletWindow,
    isMacro,
    macroWindow,
    isLunchHour,
    qualityMultiplier,
  };
}

/**
 * 2. DAILY BIAS ENGINE (Previous Day's High & Low - 4 Prinsip Emas ICT)
 * Membaca apakah candle harian kemarin body close di atas/bawah PDH/PDL (Continuation)
 * atau hanya sweep wick lalu closed inside (Reversal / Turtle Soup Liquidity Sweep).
 */
export function calculateDailyBias(candles: CandleData[], decimals: number = 2): DailyBiasResult {
  if (candles.length < 2) {
    return {
      bias: 'NEUTRAL',
      biasModel: 'CONSOLIDATION',
      pdh: 0,
      pdl: 0,
      pdhSwept: false,
      pdlSwept: false,
      pdhClosedAbove: false,
      pdlClosedBelow: false,
      narrative: 'Data candle tidak cukup untuk membentuk Daily Bias.',
    };
  }

  // Ambil candle sebelumnya (representing previous day / previous high-timeframe cycle)
  const prevCandle = candles[candles.length - 2];
  const currentCandle = candles[candles.length - 1];

  const pdh = parseFloat(prevCandle.high.toFixed(decimals));
  const pdl = parseFloat(prevCandle.low.toFixed(decimals));

  // Evaluasi aksi harga saat ini terhadap PDH & PDL
  const currentHigh = currentCandle.high;
  const currentLow = currentCandle.low;
  const currentClose = currentCandle.close;

  const sweptPDH = currentHigh > pdh;
  const sweptPDL = currentLow < pdl;
  const closedAbovePDH = currentClose > pdh;
  const closedBelowPDL = currentClose < pdl;

  let bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL' = 'NEUTRAL';
  let biasModel: 'CONTINUATION' | 'REVERSAL_SWEEP' | 'CONSOLIDATION' = 'CONSOLIDATION';
  let narrative = '';

  // Prinsip 1: Body Close di atas PDH -> Continuation Bullish ke High Baru
  if (closedAbovePDH) {
    bias = 'BULLISH';
    biasModel = 'CONTINUATION';
    narrative = `Harga Close di atas PDH ($${pdh}). Konfirmasi momentum institusi kuat (Bullish Continuation Structure) dengan target High baru.`;
  }
  // Prinsip 2: Body Close di bawah PDL -> Continuation Bearish ke Low Baru
  else if (closedBelowPDL) {
    bias = 'BEARISH';
    biasModel = 'CONTINUATION';
    narrative = `Harga Close di bawah PDL ($${pdl}). Konfirmasi ekspansi institusi kuat (Bearish Continuation Structure) dengan target Low baru.`;
  }
  // Prinsip 3: Sweep Wick di atas PDH tapi close di bawahnya -> Reversal Bearish (Liquidity Purge)
  else if (sweptPDH && currentClose <= pdh) {
    bias = 'BEARISH';
    biasModel = 'REVERSAL_SWEEP';
    narrative = `Liquidity Sweep di atas PDH ($${pdh}) meninggalkan Wick (Fakeout). Institusi mengambil Buyside Liquidity (BSL) sebelum rotasi ke PDL ($${pdl}).`;
  }
  // Prinsip 4: Sweep Wick di bawah PDL tapi close di atasnya -> Reversal Bullish (Liquidity Purge)
  else if (sweptPDL && currentClose >= pdl) {
    bias = 'BULLISH';
    biasModel = 'REVERSAL_SWEEP';
    narrative = `Liquidity Sweep di bawah PDL ($${pdl}) meninggalkan Wick. Institusi mengambil Sellside Liquidity (SSL) sebelum rotasi ke PDH ($${pdh}).`;
  }
  // Inside Bar / Range Consolidation
  else {
    const mid = (pdh + pdl) / 2;
    bias = currentClose >= mid ? 'BULLISH' : 'BEARISH';
    biasModel = 'CONSOLIDATION';
    narrative = `Harga bergerak di dalam range PDH ($${pdh}) dan PDL ($${pdl}). Menunggu mitigasi IRL atau ekspansi ke ERL.`;
  }

  return {
    bias,
    biasModel,
    pdh,
    pdl,
    pdhSwept: sweptPDH,
    pdlSwept: sweptPDL,
    pdhClosedAbove: closedAbovePDH,
    pdlClosedBelow: closedBelowPDL,
    narrative,
  };
}

/**
 * 3. FAIR VALUE GAP (FVG) / IMBALANCE DETECTOR
 * Ketidakefisienan harga 3-candle:
 * Bullish FVG (BISI): Candle 1 High < Candle 3 Low (ada gap kosong di Candle 2)
 * Bearish FVG (SIBI): Candle 1 Low > Candle 3 High (ada gap kosong di Candle 2)
 */
export function detectFVGList(candles: CandleData[], decimals: number = 2): FVGLevel[] {
  const fvgList: FVGLevel[] = [];
  if (candles.length < 4) return fvgList;

  const currentPrice = candles[candles.length - 1].close;

  // Scan 30 candle terakhir
  const startIdx = Math.max(0, candles.length - 35);
  for (let i = startIdx; i < candles.length - 2; i++) {
    const c1 = candles[i];
    const c2 = candles[i + 1];
    const c3 = candles[i + 2];

    // Bullish FVG (BISI)
    if (c3.low > c1.high) {
      const bottom = parseFloat(c1.high.toFixed(decimals));
      const top = parseFloat(c3.low.toFixed(decimals));
      const midpoint = parseFloat(((top + bottom) / 2).toFixed(decimals));
      
      // Cek apakah sudah terisi (mitigated) oleh candle setelahnya
      let isMitigated = false;
      for (let j = i + 3; j < candles.length; j++) {
        if (candles[j].low <= midpoint) {
          isMitigated = true;
          break;
        }
      }

      fvgList.push({
        type: 'BULLISH_BISI',
        top,
        bottom,
        midpoint,
        time: c2.time,
        isMitigated,
      });
    }

    // Bearish FVG (SIBI)
    if (c1.low > c3.high) {
      const top = parseFloat(c1.low.toFixed(decimals));
      const bottom = parseFloat(c3.high.toFixed(decimals));
      const midpoint = parseFloat(((top + bottom) / 2).toFixed(decimals));

      let isMitigated = false;
      for (let j = i + 3; j < candles.length; j++) {
        if (candles[j].high >= midpoint) {
          isMitigated = true;
          break;
        }
      }

      fvgList.push({
        type: 'BEARISH_SIBI',
        top,
        bottom,
        midpoint,
        time: c2.time,
        isMitigated,
      });
    }
  }

  return fvgList;
}

/**
 * 4. ORDER BLOCK (OB) DETECTOR
 * Candle berlawanan arah terakhir sebelum terjadinya pergerakan impulsif (displacement)
 */
export function detectOrderBlocks(candles: CandleData[], decimals: number = 2): OrderBlockLevel[] {
  const obList: OrderBlockLevel[] = [];
  if (candles.length < 5) return obList;

  const startIdx = Math.max(0, candles.length - 25);
  for (let i = startIdx; i < candles.length - 3; i++) {
    const cCurrent = candles[i];
    const cNext = candles[i + 1];
    const cNext2 = candles[i + 2];

    // Bullish OB: Candle Bearish (Close < Open) diikuti displacement candle bullish kuat
    if (cCurrent.close < cCurrent.open) {
      const isDisplacement = (cNext.close - cNext.open) > (cCurrent.open - cCurrent.close) * 1.5 && cNext2.close > cNext.close;
      if (isDisplacement) {
        obList.push({
          type: 'BULLISH_OB',
          high: parseFloat(cCurrent.high.toFixed(decimals)),
          low: parseFloat(cCurrent.low.toFixed(decimals)),
          open: parseFloat(cCurrent.open.toFixed(decimals)),
          close: parseFloat(cCurrent.close.toFixed(decimals)),
          time: cCurrent.time,
          isMitigated: candles.slice(i + 3).some((c) => c.low <= cCurrent.open),
        });
      }
    }

    // Bearish OB: Candle Bullish (Close > Open) diikuti displacement candle bearish kuat
    if (cCurrent.close > cCurrent.open) {
      const isDisplacement = (cNext.open - cNext.close) > (cCurrent.close - cCurrent.open) * 1.5 && cNext2.close < cNext.close;
      if (isDisplacement) {
        obList.push({
          type: 'BEARISH_OB',
          high: parseFloat(cCurrent.high.toFixed(decimals)),
          low: parseFloat(cCurrent.low.toFixed(decimals)),
          open: parseFloat(cCurrent.open.toFixed(decimals)),
          close: parseFloat(cCurrent.close.toFixed(decimals)),
          time: cCurrent.time,
          isMitigated: candles.slice(i + 3).some((c) => c.high >= cCurrent.open),
        });
      }
    }
  }

  return obList;
}

/**
 * 5. DISCOUNT & PREMIUM ARRAYS + OPTIMAL TRADE ENTRY (OTE)
 * Aturan Penting ICT:
 * - HANYA BELI (BUY) di ZONA DISKON (< 50% equilibrium, OTE 62% - 79%)
 * - HANYA JUAL (SELL) di ZONA PREMIUM (> 50% equilibrium, OTE 62% - 79%)
 * - Dilarang beli di zona Premium atau jual di zona Diskon (Penyebab utama retail sering SL)!
 */
export function calculatePremiumDiscount(candles: CandleData[], decimals: number = 2): PremiumDiscountResult {
  const windowSlice = candles.slice(-30);
  const rangeHigh = Math.max(...windowSlice.map((c) => c.high));
  const rangeLow = Math.min(...windowSlice.map((c) => c.low));
  const currentPrice = candles[candles.length - 1].close;

  const totalRange = rangeHigh - rangeLow || 1;
  const equilibrium = parseFloat(((rangeHigh + rangeLow) / 2).toFixed(decimals));

  // Fibonacci OTE Levels dari Low ke High
  const ote62 = parseFloat((rangeLow + totalRange * 0.382).toFixed(decimals)); // 62% discount level from high
  const ote705 = parseFloat((rangeLow + totalRange * 0.295).toFixed(decimals)); // 70.5% sweet spot
  const ote79 = parseFloat((rangeLow + totalRange * 0.21).toFixed(decimals));  // 79% deep discount

  const discountPct = parseFloat((((currentPrice - rangeLow) / totalRange) * 100).toFixed(1));

  let currentZone: PremiumDiscountResult['currentZone'] = 'EQUILIBRIUM';
  if (discountPct < 30) currentZone = 'DEEP_DISCOUNT';
  else if (discountPct < 48) currentZone = 'DISCOUNT';
  else if (discountPct > 70) currentZone = 'DEEP_PREMIUM';
  else if (discountPct > 52) currentZone = 'PREMIUM';
  else currentZone = 'EQUILIBRIUM';

  const isOptimalForBuy = discountPct <= 50;
  const isOptimalForSell = discountPct >= 50;

  return {
    rangeHigh: parseFloat(rangeHigh.toFixed(decimals)),
    rangeLow: parseFloat(rangeLow.toFixed(decimals)),
    equilibrium,
    ote62,
    ote705,
    ote79,
    currentZone,
    discountPct,
    isOptimalForBuy,
    isOptimalForSell,
  };
}

/**
 * 6. CISD (Change in the State of Delivery) MODEL
 * Perubahan arah aliran algoritma pengantaran harga:
 * - Bullish CISD: Harga berhasil close di atas open candle dalam sekuens bearish sebelumnya.
 * - Bearish CISD: Harga berhasil close di bawah open candle dalam sekuens bullish sebelumnya.
 */
export function detectCISD(candles: CandleData[], decimals: number = 2): CISDResult {
  if (candles.length < 4) {
    return { hasCISD: false, type: 'NONE', triggerPrice: 0, status: 'Candle tidak cukup' };
  }

  const current = candles[candles.length - 1];
  const prev1 = candles[candles.length - 2];
  const prev2 = candles[candles.length - 3];

  // Bullish CISD: candle sebelumnya bearish, candle saat ini menembus dan close di atas open bearish sebelumnya
  if (prev1.close < prev1.open && current.close > prev1.open) {
    return {
      hasCISD: true,
      type: 'BULLISH_CISD',
      triggerPrice: parseFloat(prev1.open.toFixed(decimals)),
      status: `Bullish CISD Confirmed: Body close ($${current.close}) menembus open candle bearish ($${prev1.open}). State of Delivery berubah ke Bullish.`,
    };
  }

  // Bearish CISD: candle sebelumnya bullish, candle saat ini menembus dan close di bawah open bullish sebelumnya
  if (prev1.close > prev1.open && current.close < prev1.open) {
    return {
      hasCISD: true,
      type: 'BEARISH_CISD',
      triggerPrice: parseFloat(prev1.open.toFixed(decimals)),
      status: `Bearish CISD Confirmed: Body close ($${current.close}) menembus open candle bullish ($${prev1.open}). State of Delivery berubah ke Bearish.`,
    };
  }

  return {
    hasCISD: false,
    type: 'NONE',
    triggerPrice: 0,
    status: 'Tidak ada konfirmasi CISD pada candle terakhir.',
  };
}

/**
 * 7. IRL & ERL (Internal & External Range Liquidity) ENGINE
 * Hukum Aliran ICT: IRL -> ERL -> IRL -> ERL
 * Note Emas: "Jika tidak ada Internal & External Range Liquidity yang terbentuk = NO TRADE"
 */
export function analyzeIRL_ERL(
  candles: CandleData[],
  dailyBias: DailyBiasResult,
  fvgList: FVGLevel[],
  decimals: number = 2
): IRL_ERL_Analysis {
  const currentPrice = candles[candles.length - 1].close;

  // ERL = External Liquidity Pool (PDH / BSL dan PDL / SSL)
  const erlHigh = dailyBias.pdh || Math.max(...candles.slice(-20).map((c) => c.high));
  const erlLow = dailyBias.pdl || Math.min(...candles.slice(-20).map((c) => c.low));

  // IRL = Nearest unmitigated Fair Value Gap
  const unmitigatedBullishFVG = fvgList.filter((f) => f.type === 'BULLISH_BISI' && !f.isMitigated && f.top < currentPrice);
  const unmitigatedBearishFVG = fvgList.filter((f) => f.type === 'BEARISH_SIBI' && !f.isMitigated && f.bottom > currentPrice);

  let activeIRL: FVGLevel | null = null;
  if (dailyBias.bias === 'BULLISH' && unmitigatedBullishFVG.length > 0) {
    activeIRL = unmitigatedBullishFVG[unmitigatedBullishFVG.length - 1]; // closest below
  } else if (dailyBias.bias === 'BEARISH' && unmitigatedBearishFVG.length > 0) {
    activeIRL = unmitigatedBearishFVG[unmitigatedBearishFVG.length - 1]; // closest above
  } else if (fvgList.filter((f) => !f.isMitigated).length > 0) {
    activeIRL = fvgList.filter((f) => !f.isMitigated).slice(-1)[0];
  }

  // Cek apakah ada likuiditas eksternal atau internal yang valid
  const hasValidERL = erlHigh > erlLow && erlHigh > 0;
  const noTradeCondition = !hasValidERL;

  if (noTradeCondition) {
    return {
      erlHigh,
      erlLow,
      activeIRL: null,
      cycleState: 'NO_STRUCTURE',
      nextTargetType: 'ERL_BUYSIDE',
      targetPrice: erlHigh,
      noTradeCondition: true,
      reason: 'Aturan ICT 79Trades: Likuiditas ERL/IRL belum terbentuk secara jelas = NO TRADE (Disiplin menghindari False Breakout).',
    };
  }

  // Tentukan state siklus pergerakan harga
  let cycleState: IRL_ERL_Analysis['cycleState'] = 'EXPANDING_TO_ERL';
  let nextTargetType: IRL_ERL_Analysis['nextTargetType'] = 'ERL_BUYSIDE';
  let targetPrice = erlHigh;
  let reason = '';

  if (dailyBias.biasModel === 'REVERSAL_SWEEP') {
    // Baru saja sweep ERL (misal sweep PDH) -> harga sekarang berbalik menuju IRL (FVG)
    cycleState = 'LIQUIDITY_SWEPT_REVERSING';
    if (dailyBias.bias === 'BEARISH') {
      nextTargetType = activeIRL ? 'IRL_FAIR_VALUE_GAP' : 'ERL_SELLSIDE';
      targetPrice = activeIRL ? activeIRL.midpoint : erlLow;
      reason = `ERL High swept! Harga sedang bertransisi dari ERL menuju IRL (FVG $${targetPrice}) dan Sellside Liquidity PDL ($${erlLow}).`;
    } else {
      nextTargetType = activeIRL ? 'IRL_FAIR_VALUE_GAP' : 'ERL_BUYSIDE';
      targetPrice = activeIRL ? activeIRL.midpoint : erlHigh;
      reason = `ERL Low swept! Harga sedang bertransisi dari ERL menuju IRL (FVG $${targetPrice}) dan Buyside Liquidity PDH ($${erlHigh}).`;
    }
  } else if (dailyBias.bias === 'BULLISH') {
    cycleState = 'EXPANDING_TO_ERL';
    nextTargetType = 'ERL_BUYSIDE';
    targetPrice = parseFloat((erlHigh * 1.008).toFixed(decimals)); // New High expansion
    reason = `Siklus IRL -> ERL: Menargetkan Buyside Liquidity (BSL) di atas PDH ($${erlHigh}).`;
  } else {
    cycleState = 'EXPANDING_TO_ERL';
    nextTargetType = 'ERL_SELLSIDE';
    targetPrice = parseFloat((erlLow * 0.992).toFixed(decimals)); // New Low expansion
    reason = `Siklus IRL -> ERL: Menargetkan Sellside Liquidity (SSL) di bawah PDL ($${erlLow}).`;
  }

  return {
    erlHigh,
    erlLow,
    activeIRL,
    cycleState,
    nextTargetType,
    targetPrice: parseFloat(targetPrice.toFixed(decimals)),
    noTradeCondition: false,
    reason,
  };
}

/**
 * 8. MASTER ICT CONFLUENCE & ACCURACY ENGINE
 * Mengombinasikan 5 buku ICT untuk menghasilkan sinyal presisi tinggi dengan Stop Loss ketat
 * dan Risk-to-Reward optimal (minimal 1:2 hingga 1:3.5).
 */
export function generateICTMasterAnalysis(candles: CandleData[], decimals: number = 2): ICTConfluenceReport {
  const currentPrice = candles[candles.length - 1].close;

  const killzone = getICTKillzoneInfo();
  const dailyBias = calculateDailyBias(candles, decimals);
  const fvgList = detectFVGList(candles, decimals);
  const orderBlocks = detectOrderBlocks(candles, decimals);
  const premiumDiscount = calculatePremiumDiscount(candles, decimals);
  const irlErl = analyzeIRL_ERL(candles, dailyBias, fvgList, decimals);
  const cisd = detectCISD(candles, decimals);

  const activeFVG = fvgList.filter((f) => !f.isMitigated).slice(-1)[0] || null;
  const activeOB = orderBlocks.filter((ob) => !ob.isMitigated).slice(-1)[0] || null;

  // Algoritma Penentuan Sinyal Institusional
  let smartMoneySignal: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
  let setupName = 'ICT Institutional Protocol';
  let confidence = 70;
  let rationale = '';

  // 1. FILTER 1: Aturan No Trade jika tidak ada liquidity
  if (irlErl.noTradeCondition || killzone.isLunchHour) {
    smartMoneySignal = 'WAIT';
    confidence = 50;
    setupName = killzone.isLunchHour ? 'Lunch Hour Chop Protection' : 'No Clear Liquidity (Wait)';
    rationale = killzone.isLunchHour
      ? 'Pasar berada di NY Lunch Hour (12:00-13:00 NY). Sesuai buku ICT Killzones, jam ini rawan manipulasi & chop yang sering memicu Stop Loss retail.'
      : 'Sesuai buku ICT IRL & ERL: Jika tidak ada Internal & External Liquidity yang terbentuk = NO TRADE.';
  }
  // 2. SETUP BUY PROTOCOL
  else if (
    dailyBias.bias === 'BULLISH' &&
    premiumDiscount.isOptimalForBuy && // Wajib di Zona Diskon
    (cisd.type === 'BULLISH_CISD' || dailyBias.biasModel === 'REVERSAL_SWEEP' || activeFVG?.type === 'BULLISH_BISI')
  ) {
    smartMoneySignal = 'BUY';
    setupName = cisd.hasCISD ? 'ICT CISD + OTE Discount Model' : 'ICT Liquidity Sweep & IRL Expansion';
    confidence = Math.min(96, Math.round(78 * killzone.qualityMultiplier));
    rationale = `Daily Bias BULLISH (${dailyBias.biasModel}). Harga berada di ${premiumDiscount.currentZone} (${premiumDiscount.discountPct}% range). Didukung ${cisd.hasCISD ? 'Bullish CISD konfirmasi' : 'Sweep SSL'} menuju target ERL High $${irlErl.targetPrice}.`;
  }
  // 3. SETUP SELL PROTOCOL
  else if (
    dailyBias.bias === 'BEARISH' &&
    premiumDiscount.isOptimalForSell && // Wajib di Zona Premium
    (cisd.type === 'BEARISH_CISD' || dailyBias.biasModel === 'REVERSAL_SWEEP' || activeFVG?.type === 'BEARISH_SIBI')
  ) {
    smartMoneySignal = 'SELL';
    setupName = cisd.hasCISD ? 'ICT CISD + OTE Premium Model' : 'ICT BSL Sweep & ERL Expansion';
    confidence = Math.min(96, Math.round(78 * killzone.qualityMultiplier));
    rationale = `Daily Bias BEARISH (${dailyBias.biasModel}). Harga berada di ${premiumDiscount.currentZone} (${premiumDiscount.discountPct}% range). Didukung ${cisd.hasCISD ? 'Bearish CISD konfirmasi' : 'Sweep BSL'} menuju target ERL Low $${irlErl.targetPrice}.`;
  }
  // 4. FILTER ANTI-SL: Jika sinyal ingin BUY tapi harga di Zona Premium -> FORCE WAIT
  else if (dailyBias.bias === 'BULLISH' && !premiumDiscount.isOptimalForBuy) {
    smartMoneySignal = 'WAIT';
    confidence = 60;
    setupName = 'ICT Premium Array Risk Filter';
    rationale = `Meskipun bias Bullish, harga saat ini berada di ZONA PREMIUM (${premiumDiscount.discountPct}%). Dilarang BUY di Premium untuk mencegah Stop Loss saat terjadi retracement ke IRL.`;
  }
  // 5. FILTER ANTI-SL: Jika sinyal ingin SELL tapi harga di Zona Diskon -> FORCE WAIT
  else if (dailyBias.bias === 'BEARISH' && !premiumDiscount.isOptimalForSell) {
    smartMoneySignal = 'WAIT';
    confidence = 60;
    setupName = 'ICT Discount Array Risk Filter';
    rationale = `Meskipun bias Bearish, harga saat ini berada di ZONA DISKON (${premiumDiscount.discountPct}%). Dilarang SELL di Diskon untuk mencegah Stop Loss saat terjadi retracement ke IRL.`;
  }
  // Default Wait
  else {
    smartMoneySignal = 'WAIT';
    confidence = 58;
    setupName = 'ICT Liquidity Staging Protocol';
    rationale = 'Menunggu sweep level PDH/PDL atau konfirmasi CISD di timeframe eksekusi sebelum membuka posisi.';
  }

  // Hitung Stop Loss dan Take Profit Institusional
  let suggestedEntry = currentPrice;
  let suggestedStopLoss = currentPrice;
  let suggestedTP1 = irlErl.targetPrice;
  let suggestedTP2 = irlErl.targetPrice;

  if (smartMoneySignal === 'BUY') {
    // SL diletakkan di bawah invalidasi Institusional (di bawah OB low atau di bawah PDL/Swing Low sweep)
    const invalidationLow = activeOB?.type === 'BULLISH_OB' ? activeOB.low : dailyBias.pdl || currentPrice * 0.992;
    suggestedStopLoss = parseFloat((Math.min(currentPrice * 0.994, invalidationLow)).toFixed(decimals));
    
    // Pastikan SL tidak terlalu jauh atau terlalu dekat
    const riskDistance = currentPrice - suggestedStopLoss;
    suggestedTP1 = parseFloat((currentPrice + riskDistance * 2.0).toFixed(decimals)); // RR 1:2
    suggestedTP2 = parseFloat((currentPrice + riskDistance * 3.2).toFixed(decimals)); // RR 1:3.2
  } else if (smartMoneySignal === 'SELL') {
    // SL diletakkan di atas invalidasi Institusional (di atas OB high atau di atas PDH/Swing High sweep)
    const invalidationHigh = activeOB?.type === 'BEARISH_OB' ? activeOB.high : dailyBias.pdh || currentPrice * 1.008;
    suggestedStopLoss = parseFloat((Math.max(currentPrice * 1.006, invalidationHigh)).toFixed(decimals));

    const riskDistance = suggestedStopLoss - currentPrice;
    suggestedTP1 = parseFloat((currentPrice - riskDistance * 2.0).toFixed(decimals)); // RR 1:2
    suggestedTP2 = parseFloat((currentPrice - riskDistance * 3.2).toFixed(decimals)); // RR 1:3.2
  } else {
    suggestedStopLoss = parseFloat((dailyBias.pdl || currentPrice * 0.985).toFixed(decimals));
    suggestedTP1 = parseFloat((dailyBias.pdh || currentPrice * 1.015).toFixed(decimals));
    suggestedTP2 = suggestedTP1;
  }

  const riskDist = Math.abs(currentPrice - suggestedStopLoss);
  const rewardDist = Math.abs(suggestedTP1 - currentPrice);
  const riskRewardRatio = riskDist > 0 ? parseFloat((rewardDist / riskDist).toFixed(2)) : 2.0;

  return {
    killzone,
    dailyBias,
    fvgList,
    activeFVG,
    orderBlocks,
    activeOB,
    premiumDiscount,
    irlErl,
    cisd,
    smartMoneySignal,
    confidence,
    suggestedEntry,
    suggestedStopLoss,
    suggestedTP1,
    suggestedTP2,
    riskRewardRatio,
    setupName,
    rationale,
  };
}
