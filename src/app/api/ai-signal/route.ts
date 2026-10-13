import { NextRequest, NextResponse } from 'next/server';
import { CandleData, GeneratedAISignal } from '../../../types/market';
import { analyzeTechnicalIndicators } from '../../../lib/indicators';
import { generateCandleData } from '../../../data/mockData';

// Helper: ambil data candlestick riil (dari Binance jika kripto) atau fallback deterministik
async function fetchRealOrFallbackCandles(
  symbol: string,
  timeframe: string,
  currentPrice: number
): Promise<CandleData[]> {
  const cleanSym = symbol.toUpperCase().replace('/', '');
  const isForex = symbol.includes('EUR') || symbol.includes('GBP') || symbol.includes('JPY') || symbol.includes('AUD');

  if (!isForex) {
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
      const url = `https://api.binance.com/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=50`;
      const res = await fetch(url, { cache: 'no-store' });
      if (res.ok) {
        const rawKlines: Array<[number, string, string, string, string, string]> = await res.json();
        if (Array.isArray(rawKlines) && rawKlines.length >= 15) {
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
      }
    } catch {
      // Fallback
    }
  }

  return generateCandleData(currentPrice, timeframe, 48);
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
    const provider: 'gemini' | 'openai' = (body.provider as 'gemini' | 'openai') || 'gemini';

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

    // Ringkasan 8 candlestick terakhir untuk konteks prompt
    const recentCandlesText = candles
      .slice(-8)
      .map(
        (c) =>
          `[${c.time}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} Vol:${c.volume}`
      )
      .join('\n');

    // 3. Prompt Analisis Terstruktur Berbasis Fakta Kuantitatif
    const systemPrompt = `Anda adalah Sistem Analisis Finansial Kuantitatif & Algoritmik Tingkat Tinggi di "BetaTech Trade Analytics".
Tugas Anda adalah menghasilkan sinyal trading berpresisi tinggi berdasarkan data pasar candlestick dan indikator teknikal mutakhir.

DATA PASAR TERVERIFIKASI:
- Simbol / Pair: ${symbol}
- Timeframe: ${timeframe}
- Harga Saat Ini: ${currentPrice}
- RSI (14 period): ${rsi} (${rsiStatus})
- Moving Average (EMA 20): ${maShort} | (EMA 50): ${maLong} | (EMA Trend): ${ma200}
- Status Tren MA: ${trend}
- MACD (12, 26, 9): Histogram ${macd.histogram} (Trend: ${macd.trend})
- Volatilitas ATR (14): ${atr}
- Bollinger Bands: Upper ${bollinger.upper} | Middle ${bollinger.middle} | Lower ${bollinger.lower} (%B: ${bollinger.percentB})
- Support Kunci: ${support} | Resistance Kunci: ${resistance}
- Skor Konfluensi Algoritma: ${confluenceScore} (-100 sangat bearish s/d +100 sangat bullish)

8 CANDLE TERAKHIR:
${recentCandlesText}

ATURAN KETAT:
1. Signal HARUS salah satu dari: ["BUY", "SELL", "WAIT"].
   - Jika Skor Konfluensi >= 35: sinyal BUY.
   - Jika Skor Konfluensi <= -35: sinyal SELL.
   - Jika -34 s/d +34 atau indikator saling bertentangan: sinyal WAIT (konsolidasi, jangan asal spekulasi).
2. Confidence: Angka bulat 60 sampai 94 (%).
3. Risk Management & Risk-to-Reward (R:R minimal 1:1.6):
   - Jika BUY: Stop Loss HARUS di bawah harga saat ini (${currentPrice}) dekat support (${support}) atau 1.5x ATR (${atr}). Target Price HARUS di atas harga saat ini dengan R:R >= 1.6.
   - Jika SELL: Stop Loss HARUS di atas harga saat ini (${currentPrice}) dekat resistance (${resistance}) atau 1.5x ATR (${atr}). Target Price HARUS di bawah harga saat ini dengan R:R >= 1.6.
   - Jika WAIT: Stop Loss di level support (${support}), Target Price di level resistance (${resistance}).
4. Tulis reason: Tepat 1-2 kalimat lugas dan profesional dalam Bahasa Indonesia menjelaskan korelasi konfluensi indikator secara matematis (RSI, MACD, MA, dan S/R).

OUTPUT WAJIB JSON MURNI TANPA MARKDOWN BACKTICKS:
{
  "signal": "BUY" | "SELL" | "WAIT",
  "confidence": 85,
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
    let usedProvider: 'gemini' | 'openai' | 'algo-engine' = 'algo-engine';

    // 4A. Eksekusi via Gemini API jika key tersedia
    if (provider === 'gemini' && geminiKey) {
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
