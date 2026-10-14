import { NextRequest, NextResponse } from 'next/server';
import path from 'node:path';
import fs from 'node:fs';
import { CandleData, GeneratedAISignal, ICTSignalData } from '../../../types/market';
import { analyzeTechnicalIndicators } from '../../../lib/indicators';

// Helper: Temukan API Key 9Router dari environment atau database SQLite lokal secara otomatis
function discover9RouterKey(): string {
  if (process.env.NINE_ROUTER_KEY) return process.env.NINE_ROUTER_KEY;
  if (process.env.ROUTER_API_KEY) return process.env.ROUTER_API_KEY;

  try {
    const appData = process.env.APPDATA;
    if (appData) {
      const dbPath = path.join(appData, '9router', 'db', 'data.sqlite');
      if (fs.existsSync(dbPath)) {
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const { DatabaseSync } = require('node:sqlite');
        const db = new DatabaseSync(dbPath, { readOnly: true });
        const row = db.prepare('SELECT key FROM apiKeys WHERE isActive = 1 LIMIT 1').get() as { key?: string } | undefined;
        if (row?.key) return row.key;
      }
    }
  } catch {
    // Ignore fallback
  }
  return '';
}

// Helper: Eksekusi analisis via 9Router dengan auto-rotation ke model yang paling OP
async function executeAuto9Router(
  systemPrompt: string,
  apiKey?: string,
  baseUrl: string = 'http://127.0.0.1:20128/v1',
  preferredModel?: string
): Promise<{ parsed: Record<string, unknown>; usedModel: string } | null> {
  const routerKey = apiKey || discover9RouterKey();
  const url = baseUrl.endsWith('/v1') ? baseUrl : `${baseUrl}/v1`;

  // 1. Ambil daftar model aktif yang terhubung ke 9Router
  let activeModels: string[] = [];
  try {
    const modelsRes = await fetch(`${url}/models`, {
      headers: routerKey ? { Authorization: `Bearer ${routerKey}` } : {},
      cache: 'no-store',
    });
    if (modelsRes.ok) {
      const json = await modelsRes.json();
      activeModels = (json.data || []).map((m: { id: string }) => m.id);
    }
  } catch {
    // Jika fetch models gagal, gunakan fallback model
  }

  // 2. Daftar prioritas Model AI paling OP & kapabel
  const opPriority = [
    'ag/claude-sonnet-5-5-high',
    'ag/gemini-3.8-flash-high',
    'bs/deepseek-v4.1-flash',
    'beatapi/gemini-3.8-flash-free',
    'ag/gemini-3.8-flash',
    'beatapi/claude-opus-5-5',
    'gcli/grok-4.7',
    'bs/deepseek-3.2',
    'ag/gemini-3.7-flash-high',
    'bs/claude-sonnet-4-5',
  ];

  let candidateModels: string[] = [];
  if (preferredModel && preferredModel !== 'auto') {
    candidateModels = [preferredModel, ...opPriority.filter((m) => m !== preferredModel)];
  } else if (activeModels.length > 0) {
    candidateModels = [
      ...opPriority.filter((m) => activeModels.includes(m)),
      ...activeModels.filter((m) => !opPriority.includes(m)),
    ];
  } else {
    candidateModels = opPriority;
  }

  // 3. Coba model secara berurutan sampai menemukan yang aktif & merespons
  for (const model of candidateModels.slice(0, 5)) {
    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (routerKey) headers.Authorization = `Bearer ${routerKey}`;

      const res = await fetch(`${url}/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an institutional quantitative trading AI. Output raw JSON only matching schema.',
            },
            {
              role: 'user',
              content: systemPrompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.15,
          stream: false,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (content) {
          const cleanText = content.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanText) as Record<string, unknown>;
          return { parsed, usedModel: model };
        }
      }
    } catch {
      // Coba model kandidat berikutnya
    }
  }

  return null;
}

// Helper: ambil data candlestick riil (dari Binance untuk kripto, Yahoo Finance untuk Forex) atau fallback deterministik
async function fetchRealOrFallbackCandles(
  symbol: string,
  timeframe: string,
  currentPrice: number
): Promise<CandleData[]> {
  const cleanSym = symbol.toUpperCase().replace('/', '');
  const isForex = symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('JPY') || symbol.includes('AUD') || symbol.includes('CAD') || symbol.includes('CHF') || symbol.includes('XAU') || symbol.includes('GOLD');

  if (isForex) {
    try {
      const clean = symbol.toUpperCase().trim();
      let yahooSymbol = `${clean.replace('/', '')}=X`;
      if (clean.includes('XAU') || clean.includes('GOLD')) yahooSymbol = 'GC=F';
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1h&range=5d`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        const result = data?.chart?.result?.[0];
        const timestamps: number[] = result?.timestamp || [];
        const quote = result?.indicators?.quote?.[0] || {};
        const opens = quote.open || [];
        const highs = quote.high || [];
        const lows = quote.low || [];
        const closes = quote.close || [];
        const volumes = quote.volume || [];

        const realCandles: CandleData[] = [];
        for (let i = 0; i < timestamps.length; i++) {
          if (opens[i] != null && closes[i] != null && highs[i] != null && lows[i] != null) {
            realCandles.push({
              time: new Date(timestamps[i] * 1000).toISOString().slice(11, 16),
              timestamp: timestamps[i],
              open: opens[i],
              high: highs[i],
              low: lows[i],
              close: closes[i],
              volume: volumes[i] || 1000,
              color: closes[i] >= opens[i] ? 'bull' : 'bear',
            });
          }
        }
        if (realCandles.length >= 15) {
          return realCandles.slice(-50);
        }
      }
    } catch {
      // Fallback
    }
  } else {
    try {
      const binanceSymbol = cleanSym.endsWith('USDT')
        ? cleanSym
        : cleanSym.endsWith('USD')
        ? cleanSym.replace('USD', 'USDT')
        : `${cleanSym}USDT`;

      const tfMap: Record<string, string> = {
        '1m': '1m',
        '5m': '5m',
        '15m': '15m',
        '1h': '1h',
        '4h': '4h',
        '1d': '1d',
        '1w': '1w',
      };
      const interval = tfMap[timeframe] || '1h';
      // api.binance.com is geo-blocked in some regions; the public data mirror is equivalent.
      let rawKlines: Array<[number, string, string, string, string, string]> | null = null;
      for (const host of ['https://data-api.binance.vision', 'https://api.binance.com']) {
        try {
          const res = await fetch(`${host}/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=50`, { cache: 'no-store' });
          if (res.ok) {
            const parsed = await res.json();
            if (Array.isArray(parsed) && parsed.length >= 15) { rawKlines = parsed; break; }
          }
        } catch {
          // try next host
        }
      }
      if (rawKlines) {
        return rawKlines.map((k) => {
          const timeSec = Math.floor(Number(k[0]) / 1000);
          const open = parseFloat(k[1]);
          const high = parseFloat(k[2]);
          const low = parseFloat(k[3]);
          const close = parseFloat(k[4]);
          const volume = parseFloat(k[5]);
          return {
            time: new Date(timeSec * 1000).toISOString().slice(11, 16),
            timestamp: timeSec,
            open,
            high,
            low,
            close,
            volume,
            color: close >= open ? 'bull' : 'bear',
          };
        });
      }

      // Crypto fallback: Yahoo Finance (Binance can be unreachable entirely)
      const base = cleanSym.replace(/USDT$/, '').replace(/USD$/, '');
      const yahooRes = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${base}-USD?interval=1h&range=1mo`,
        { headers: { 'User-Agent': 'Mozilla/5.0' }, cache: 'no-store' }
      );
      if (yahooRes.ok) {
        const y = await yahooRes.json();
        const r = y?.chart?.result?.[0];
        const q = r?.indicators?.quote?.[0] || {};
        const ts: number[] = r?.timestamp || [];
        const out: CandleData[] = [];
        for (let i = 0; i < ts.length; i++) {
          const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
          if (o == null || h == null || l == null || c == null) continue;
          out.push({
            time: new Date(ts[i] * 1000).toISOString().slice(11, 16),
            timestamp: ts[i],
            open: o, high: h, low: l, close: c,
            volume: q.volume?.[i] || 0,
            color: c >= o ? 'bull' : 'bear',
          });
        }
        if (out.length >= 15) return out.slice(-50);
      }
    } catch {
      // Fallback
    }
  }

  // No real candles available: return empty rather than a synthetic series,
  // which would make the AI reason about structure that never existed.
  return [];
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const symbol: string = (body.symbol as string) || 'BTC/USD';
    const timeframe: string = (body.timeframe as string) || '1h';
    const currentPrice: number = (body.currentPrice as number) || (symbol.includes('EUR') ? 1.0846 : 89420.50);
    const userApiKey: string | undefined = body.apiKey as string | undefined;
    const provider: string = (body.provider as string) || 'auto';
    const preferredModel: string | undefined = body.model as string | undefined;
    const routerBaseUrl: string | undefined = body.routerUrl as string | undefined;

    // 1. Ambil / validasi data candlestick OHLCV (Gunakan data riil chart jika dikirim, atau fetch dari Binance)
    let candles = body.candles as CandleData[] | undefined;
    if (!candles || candles.length < 15) {
      candles = await fetchRealOrFallbackCandles(symbol, timeframe, currentPrice);
    }

    // 2. Analisis indikator kuantitatif institusional
    const decimals = symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('JPY') || currentPrice < 10 ? 4 : 2;
    const indicators = analyzeTechnicalIndicators(candles, decimals);
    const {
      rsi,
      rsiStatus,
      maShort,
      maLong,
      ma200,
      trend,
      macd,
      atr,
      bollinger,
      support,
      resistance,
      confluenceScore,
      recommendedSignal,
      confidence: algoConfidence,
      targetPrice: algoTarget,
      stopLoss: algoStop,
      riskRewardRatio: algoRR,
      reason: algoReason,
    } = indicators;

    const ict = indicators.ict;
    const ictData: ICTSignalData | undefined = ict ? {
      dailyBias: ict.dailyBias.bias,
      biasModel: ict.dailyBias.biasModel,
      pdh: ict.dailyBias.pdh,
      pdl: ict.dailyBias.pdl,
      killzoneName: ict.killzone.sessionName,
      isKillzoneActive: ict.killzone.isKillzone,
      isSilverBullet: ict.killzone.isSilverBullet,
      zone: ict.premiumDiscount.currentZone,
      discountPct: ict.premiumDiscount.discountPct,
      fvgTop: ict.activeFVG?.top,
      fvgBottom: ict.activeFVG?.bottom,
      fvgMidpoint: ict.activeFVG?.midpoint,
      orderBlockLevel: ict.activeOB ? (ict.activeOB.type === 'BULLISH_OB' ? ict.activeOB.low : ict.activeOB.high) : undefined,
      cisdStatus: ict.cisd.status,
      irlErlTarget: ict.irlErl.targetPrice,
      setupName: ict.setupName,
    } : undefined;

    // Ringkasan 8 candlestick terakhir untuk konteks prompt
    const recentCandlesText = candles
      .slice(-8)
      .map(
        (c) =>
          `[${c.time}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} Vol:${c.volume}`
      )
      .join('\n');

    // 3. Prompt Analisis Terstruktur Berbasis Fakta Kuantitatif & ICT Smart Money
    const systemPrompt = `Anda adalah Sistem Analisis Finansial Kuantitatif & Algoritmik Tingkat Tinggi di "BetaTech Trade Analytics" yang menguasai Smart Money Concepts (SMC) & ICT (Inner Circle Trader) 79Trades.
Tugas Anda adalah menghasilkan sinyal trading berpresisi tinggi dengan STOP LOSS KETAT DAN AMAN (anti-stop hunt) berdasarkan data pasar candlestick, indikator teknikal, dan struktur ICT.

DATA PASAR TERVERIFIKASI:
- Simbol / Pair: ${symbol} | Timeframe: ${timeframe} | Harga Saat Ini: ${currentPrice}
- RSI (14 period): ${rsi} (${rsiStatus}) | MA: EMA20 ${maShort}, EMA50 ${maLong}, EMA200 ${ma200} (${trend})
- MACD (12, 26, 9): Histogram ${macd.histogram} (${macd.trend}) | ATR (14): ${atr}
- Support Kunci: ${support} | Resistance Kunci: ${resistance}
- Skor Konfluensi Algoritma: ${confluenceScore} (-100 s/d +100)

STRUKTUR SMART MONEY & ICT 79TRADES:
- Daily Bias Harian: ${ict?.dailyBias.bias} (${ict?.dailyBias.biasModel})
- Level Kunci: Previous Day's High (PDH) $${ict?.dailyBias.pdh} | Previous Day's Low (PDL) $${ict?.dailyBias.pdl}
- Status Sweep: PDH Swept: ${ict?.dailyBias.pdhSwept ? 'YA' : 'TIDAK'} | PDL Swept: ${ict?.dailyBias.pdlSwept ? 'YA' : 'TIDAK'}
- Sesi & Killzone ICT: ${ict?.killzone.sessionName} (NY Time: ${ict?.killzone.currentNYTime})
- Silver Bullet Status: ${ict?.killzone.isSilverBullet ? ict.killzone.silverBulletWindow : 'Tidak Aktif'} | Macro: ${ict?.killzone.isMacro ? ict.killzone.macroWindow : 'Tidak Aktif'}
- Discount / Premium Range: ${ict?.premiumDiscount.currentZone} (${ict?.premiumDiscount.discountPct}% range, Equilibrium $${ict?.premiumDiscount.equilibrium})
- Optimal Buy Zone: ${ict?.premiumDiscount.isOptimalForBuy ? 'YA (Di Bawah 50% Diskon)' : 'TIDAK (Di Atas 50% Premium)'}
- Optimal Sell Zone: ${ict?.premiumDiscount.isOptimalForSell ? 'YA (Di Atas 50% Premium)' : 'TIDAK (Di Bawah 50% Diskon)'}
- Siklus IRL <-> ERL: ${ict?.irlErl.cycleState} (Target: ${ict?.irlErl.nextTargetType} di $${ict?.irlErl.targetPrice})
- Konfirmasi CISD (Change in the State of Delivery): ${ict?.cisd.type} (${ict?.cisd.status})
- Active FVG: ${ict?.activeFVG ? `${ict.activeFVG.type} ($${ict.activeFVG.bottom} - $${ict.activeFVG.top})` : 'None'}
- Active Order Block: ${ict?.activeOB ? `${ict.activeOB.type} ($${ict.activeOB.low} - $${ict.activeOB.high})` : 'None'}

8 CANDLE TERAKHIR:
${recentCandlesText}

ATURAN KETAT ANTI-STOP LOSS INSTITUSIONAL (ICT 79TRADES):
1. JANGAN PERNAH BUY DI ZONA PREMIUM (>50%) dan JANGAN PERNAH SELL DI ZONA DISKON (<50%). Pelanggaran aturan ini sering menyebabkan Stop Loss retail tersapu. Jika kondisi ini terjadi, WAJIB sinyal "WAIT".
2. STOP LOSS TIDAK BOLEH ASAL TEBAK:
   - Jika BUY: Stop Loss WAJIB di bawah invalidasi Order Block atau Liquidity Sweep Low ($${algoStop}).
   - Jika SELL: Stop Loss WAJIB di atas invalidasi Order Block atau Liquidity Sweep High ($${algoStop}).
3. TARGET TAKE PROFIT: Arahkan ke External Liquidity Pool (PDH/PDL) atau Fair Value Gap dengan Risk-to-Reward minimal 1:1.8 hingga 1:3.2.
4. "Jika tidak ada Internal & External Range Liquidity yang terbentuk = NO TRADE" -> sinyal "WAIT".
5. Confidence: Angka bulat 60 sampai 96 (%).
6. Tulis reason: Tepat 1-2 kalimat lugas dan profesional dalam Bahasa Indonesia menjelaskan korelasi konfluensi indikator dan ICT (Daily Bias, FVG/OB, Killzone, Discount/Premium).

OUTPUT WAJIB JSON MURNI TANPA MARKDOWN BACKTICKS:
{
  "signal": "BUY" | "SELL" | "WAIT",
  "confidence": 88,
  "targetPrice": ${algoTarget},
  "stopLoss": ${algoStop},
  "riskRewardRatio": ${algoRR},
  "reason": "Penjelasan ringkas...",
  "indicators": {
    "rsi": ${rsi},
    "rsiStatus": "${rsiStatus}",
    "maShort": ${maShort},
    "maLong": ${maLong},
    "trend": "${trend}"
  }
}`;

    const geminiKey = userApiKey || process.env.GEMINI_API_KEY;
    const openaiKey = userApiKey || process.env.OPENAI_API_KEY;

    let aiResult: GeneratedAISignal | null = null;
    let usedProvider: string = 'algo-engine';

    // 4A. Eksekusi via 9Router (Multi-Model Auto-Rotation ke AI paling OP)
    if (provider === 'auto' || provider === '9router') {
      try {
        const routerResult = await executeAuto9Router(
          systemPrompt,
          userApiKey,
          routerBaseUrl,
          preferredModel
        );

        if (routerResult && routerResult.parsed) {
          const parsed = routerResult.parsed;
          const parsedSignal: 'BUY' | 'SELL' | 'WAIT' =
            parsed.signal === 'BUY' || parsed.signal === 'SELL' || parsed.signal === 'WAIT'
              ? parsed.signal
              : recommendedSignal;

          let targetPrice = Number(parsed.targetPrice) || algoTarget;
          let stopLoss = Number(parsed.stopLoss) || algoStop;

          // Validasi integritas arah SL & TP
          if (parsedSignal === 'BUY' && (stopLoss >= currentPrice || targetPrice <= currentPrice)) {
            stopLoss = algoStop;
            targetPrice = algoTarget;
          } else if (parsedSignal === 'SELL' && (stopLoss <= currentPrice || targetPrice >= currentPrice)) {
            stopLoss = algoStop;
            targetPrice = algoTarget;
          }

          const riskDistance = Math.abs(currentPrice - stopLoss);
          const rewardDistance = Math.abs(targetPrice - currentPrice);
          const riskRewardRatio = riskDistance > 0 ? parseFloat((rewardDistance / riskDistance).toFixed(2)) : algoRR;

          aiResult = {
            signal: parsedSignal,
            confidence: Math.min(95, Math.max(50, Number(parsed.confidence) || algoConfidence)),
            targetPrice,
            stopLoss,
            riskRewardRatio,
            reason: String(parsed.reason || algoReason),
            indicators: {
              rsi: Number((parsed.indicators as Record<string, unknown>)?.rsi) || rsi,
              rsiStatus: ((parsed.indicators as Record<string, unknown>)?.rsiStatus as string) || rsiStatus,
              maShort: Number((parsed.indicators as Record<string, unknown>)?.maShort) || maShort,
              maLong: Number((parsed.indicators as Record<string, unknown>)?.maLong) || maLong,
              trend: ((parsed.indicators as Record<string, unknown>)?.trend as string) || trend,
              macd,
              atr,
              bollinger,
              confluenceScore,
              support,
              resistance,
            },
            ict: ictData,
            symbol,
            currentPrice,
            timeframe,
            provider: `9Router (${routerResult.usedModel})`,
            analyzedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          };
          usedProvider = `9router/${routerResult.usedModel}`;
        }
      } catch (err) {
        console.warn('9Router execution warning, falling back:', err);
      }
    }

    // 4B. Eksekusi via Gemini API jika key tersedia dan 9Router belum berhasil
    if (!aiResult && (provider === 'gemini' || provider === 'auto') && geminiKey) {
      try {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`;
        const res = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawText) {
            const parsed = JSON.parse(rawText.replace(/```json/g, '').replace(/```/g, '').trim());
            const parsedSignal: 'BUY' | 'SELL' | 'WAIT' =
              parsed.signal === 'BUY' || parsed.signal === 'SELL' || parsed.signal === 'WAIT'
                ? parsed.signal
                : recommendedSignal;

            let targetPrice = Number(parsed.targetPrice) || algoTarget;
            let stopLoss = Number(parsed.stopLoss) || algoStop;

            // Validasi integritas arah SL & TP
            if (parsedSignal === 'BUY' && (stopLoss >= currentPrice || targetPrice <= currentPrice)) {
              stopLoss = algoStop;
              targetPrice = algoTarget;
            } else if (parsedSignal === 'SELL' && (stopLoss <= currentPrice || targetPrice >= currentPrice)) {
              stopLoss = algoStop;
              targetPrice = algoTarget;
            }

            const riskDistance = Math.abs(currentPrice - stopLoss);
            const rewardDistance = Math.abs(targetPrice - currentPrice);
            const riskRewardRatio = riskDistance > 0 ? parseFloat((rewardDistance / riskDistance).toFixed(2)) : algoRR;

            aiResult = {
              signal: parsedSignal,
              confidence: Math.min(95, Math.max(50, Number(parsed.confidence) || algoConfidence)),
              targetPrice,
              stopLoss,
              riskRewardRatio,
              reason: parsed.reason || algoReason,
              indicators: {
                rsi: Number(parsed.indicators?.rsi) || rsi,
                rsiStatus: parsed.indicators?.rsiStatus || rsiStatus,
                maShort: Number(parsed.indicators?.maShort) || maShort,
                maLong: Number(parsed.indicators?.maLong) || maLong,
                trend: parsed.indicators?.trend || trend,
                macd,
                atr,
                bollinger,
                confluenceScore,
                support,
                resistance,
              },
              ict: ictData,
              symbol,
              currentPrice,
              timeframe,
              provider: 'gemini',
              analyzedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
            usedProvider = 'gemini';
          }
        }
      } catch (err) {
        console.warn('Gemini API call warning, using fallback quantitative engine:', err);
      }
    }

    // 4B. Eksekusi via OpenAI API jika key tersedia
    if (!aiResult && provider === 'openai' && openaiKey) {
      try {
        const openaiUrl = 'https://api.openai.com/v1/chat/completions';
        const res = await fetch(openaiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: systemPrompt }],
            response_format: { type: 'json_object' },
            temperature: 0.2,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const rawText = data?.choices?.[0]?.message?.content;
          if (rawText) {
            const parsed = JSON.parse(rawText);
            const parsedSignal: 'BUY' | 'SELL' | 'WAIT' =
              parsed.signal === 'BUY' || parsed.signal === 'SELL' || parsed.signal === 'WAIT'
                ? parsed.signal
                : recommendedSignal;

            let targetPrice = Number(parsed.targetPrice) || algoTarget;
            let stopLoss = Number(parsed.stopLoss) || algoStop;

            if (parsedSignal === 'BUY' && (stopLoss >= currentPrice || targetPrice <= currentPrice)) {
              stopLoss = algoStop;
              targetPrice = algoTarget;
            } else if (parsedSignal === 'SELL' && (stopLoss <= currentPrice || targetPrice >= currentPrice)) {
              stopLoss = algoStop;
              targetPrice = algoTarget;
            }

            const riskDistance = Math.abs(currentPrice - stopLoss);
            const rewardDistance = Math.abs(targetPrice - currentPrice);
            const riskRewardRatio = riskDistance > 0 ? parseFloat((rewardDistance / riskDistance).toFixed(2)) : algoRR;

            aiResult = {
              signal: parsedSignal,
              confidence: Math.min(95, Math.max(50, Number(parsed.confidence) || algoConfidence)),
              targetPrice,
              stopLoss,
              riskRewardRatio,
              reason: parsed.reason || algoReason,
              indicators: {
                rsi: Number(parsed.indicators?.rsi) || rsi,
                rsiStatus: parsed.indicators?.rsiStatus || rsiStatus,
                maShort: Number(parsed.indicators?.maShort) || maShort,
                maLong: Number(parsed.indicators?.maLong) || maLong,
                trend: parsed.indicators?.trend || trend,
                macd,
                atr,
                bollinger,
                confluenceScore,
                support,
                resistance,
              },
              ict: ictData,
              symbol,
              currentPrice,
              timeframe,
              provider: 'openai',
              analyzedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
            };
            usedProvider = 'openai';
          }
        }
      } catch (err) {
        console.warn('OpenAI API call warning, using fallback quantitative engine:', err);
      }
    }

    // 4C. High-Fidelity Institutional Algorithmic Engine Fallback
    if (!aiResult) {
      aiResult = {
        signal: recommendedSignal,
        confidence: algoConfidence,
        targetPrice: algoTarget,
        stopLoss: algoStop,
        riskRewardRatio: algoRR,
        reason: algoReason,
        indicators: {
          rsi,
          rsiStatus,
          maShort,
          maLong,
          trend,
          macd,
          atr,
          bollinger,
          confluenceScore,
          support,
          resistance,
        },
        ict: ictData,
        symbol,
        currentPrice,
        timeframe,
        provider: 'algo-engine',
        analyzedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      usedProvider = 'algo-engine';
    }

    // 5. Kembalikan output JSON
    return NextResponse.json(aiResult, {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
        'X-AI-Provider': usedProvider,
      },
    });
  } catch (error: unknown) {
    console.error('Error generating AI signal:', error);
    return NextResponse.json(
      {
        error: 'Gagal menganalisis data sinyal pasar.',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const symbol = searchParams.get('symbol') || 'BTC/USD';
  const timeframe = searchParams.get('timeframe') || '1h';
  const currentPrice = symbol.includes('EUR') ? 1.0846 : 89420.50;

  // Delegasikan ke logika POST
  return POST(
    new NextRequest(req.url, {
      method: 'POST',
      body: JSON.stringify({ symbol, timeframe, currentPrice }),
      headers: { 'Content-Type': 'application/json' },
    })
  );
}
