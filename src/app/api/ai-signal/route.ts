import { NextRequest, NextResponse } from 'next/server';
import { CandleData, GeneratedAISignal } from '../../../types/market';
import { analyzeTechnicalIndicators } from '../../../lib/indicators';
import { generateCandleData } from '../../../data/mockData';

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

    // 1. Ambil / validasi data candlestick OHLCV terbaru
    let candles = body.candles as CandleData[] | undefined;
    if (!candles || candles.length < 15) {
      candles = generateCandleData(currentPrice, timeframe, 42);
    }

    // 2. Analisis indikator teknikal (RSI & Moving Average 20 / 50)
    const indicators = analyzeTechnicalIndicators(candles);
    const { rsi, maShort, maLong, trend, support, resistance } = indicators;

    // Ringkasan 8 candlestick terakhir untuk konteks prompt
    const recentCandlesText = candles
      .slice(-8)
      .map(
        (c) =>
          `[${c.time}] O:${c.open} H:${c.high} L:${c.low} C:${c.close} Vol:${c.volume}`
      )
      .join('\n');

    // 3. Susun Prompt Analisis Terstruktur untuk LLM
    const systemPrompt = `Anda adalah Sistem Analisis Finansial Kuantitatif & Algoritmik terkemuka di "BetaTech Trade Analytics".
Tugas Anda adalah menganalisis data pasar candlestick OHLCV terbaru dan indikator teknikal kunci (RSI dan Moving Average) untuk menghasilkan sinyal trading presisi tinggi.

DATA PASAR:
- Simbol / Pair: ${symbol}
- Timeframe: ${timeframe}
- Harga Saat Ini: ${currentPrice}
- RSI (14 period): ${rsi} (${rsi < 30 ? 'OVERSOLD' : rsi > 70 ? 'OVERBOUGHT' : 'NETRAL'})
- Moving Average Cepat (EMA 20): ${maShort}
- Moving Average Lambat (EMA 50): ${maLong}
- Status Tren MA: ${trend}
- Support Kunci: ${support}
- Resistance Kunci: ${resistance}

8 CANDLE TERAKHIR:
${recentCandlesText}

ATURAN STRATEGI:
1. Analisis momentum RSI: Jika RSI < 35 berpotensi BUY (rebound), RSI > 65 berpotensi SELL (pullback), atau konfirmasi kelanjutan tren.
2. Analisis Moving Average: Perhatikan posisi harga terhadap EMA 20 & EMA 50, serta potensi Golden Cross (MA20 > MA50) atau Death Cross.
3. Tentukan signal: TEPAT salah satu dari ["BUY", "SELL", "WAIT"].
4. Tentukan confidence: Angka bulat 50 sampai 95 (%).
5. Tentukan targetPrice: Target profit realistis berdasarkan jarak R:R minimal 1:1.5.
6. Tentukan stopLoss: Level proteksi risiko di luar support/resistance atau MA.
7. Tulis reason: Tepat 1-2 kalimat padat dan profesional dalam Bahasa Indonesia menjelaskan korelasi RSI dan Moving Average.

OUTPUT HARUS BERUPA JSON MURNI TANPA MARKDOWN BACKTICKS ATAU TEKS LAIN:
{
  "signal": "BUY" | "SELL" | "WAIT",
  "confidence": 85,
  "targetPrice": 92500,
  "stopLoss": 87800,
  "reason": "Penjelasan ringkas...",
  "indicators": {
    "rsi": ${rsi},
    "maShort": ${maShort},
    "maLong": ${maLong},
    "trend": "${trend}"
  }
}`;

    // Cek ketersediaan API Key
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
            aiResult = {
              signal: parsed.signal || (parsed.action?.includes('BUY') ? 'BUY' : 'WAIT'),
              confidence: Number(parsed.confidence) || 82,
              targetPrice: Number(parsed.targetPrice) || currentPrice * 1.03,
              stopLoss: Number(parsed.stopLoss) || currentPrice * 0.985,
              reason: parsed.reason || 'Analisis momentum RSI dan konfirmasi tren MA mengindikasikan potensi pergerakan terarah.',
              indicators: {
                rsi: Number(parsed.indicators?.rsi) || rsi,
                maShort: Number(parsed.indicators?.maShort) || maShort,
                maLong: Number(parsed.indicators?.maLong) || maLong,
                trend: parsed.indicators?.trend || trend,
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

    // 4B. Eksekusi via OpenAI API jika dipilih dan key tersedia
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
            aiResult = {
              signal: parsed.signal || 'BUY',
              confidence: Number(parsed.confidence) || 84,
              targetPrice: Number(parsed.targetPrice) || currentPrice * 1.03,
              stopLoss: Number(parsed.stopLoss) || currentPrice * 0.985,
              reason: parsed.reason || 'Kombinasi RSI dan Moving Average mengonfirmasi setup arah pergerakan pasar.',
              indicators: {
                rsi: Number(parsed.indicators?.rsi) || rsi,
                maShort: Number(parsed.indicators?.maShort) || maShort,
                maLong: Number(parsed.indicators?.maLong) || maLong,
                trend: parsed.indicators?.trend || trend,
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

    // 4C. High-Fidelity Quantitative Algorithmic Engine Fallback
    // Menjamin API tidak pernah down / error jika user belum input API key
    if (!aiResult) {
      let calcSignal: 'BUY' | 'SELL' | 'WAIT' = 'WAIT';
      let calcConfidence = 75;
      let calcTarget = currentPrice * 1.025;
      let calcStop = currentPrice * 0.985;
      let calcReason = '';

      const isDecimals4 = currentPrice < 10;
      const roundVal = (v: number) => isDecimals4 ? parseFloat(v.toFixed(4)) : parseFloat(v.toFixed(2));

      if (rsi < 40 && currentPrice >= maLong * 0.99) {
        calcSignal = 'BUY';
        calcConfidence = 88;
        calcTarget = roundVal(currentPrice + Math.abs(resistance - currentPrice) * 0.9 || currentPrice * 1.035);
        calcStop = roundVal(support * 0.995 || currentPrice * 0.985);
        calcReason = `RSI di level ${rsi} (oversold bounce) dengan harga bertahan di atas MA50 (${maLong}), mengonfirmasi pantulan akumulasi buyer yang kuat.`;
      } else if (maShort > maLong && currentPrice > maShort) {
        calcSignal = 'BUY';
        calcConfidence = 84;
        calcTarget = roundVal(currentPrice * 1.038);
        calcStop = roundVal(maLong * 0.994);
        calcReason = `Struktur Golden Cross terkonfirmasi dengan harga di atas EMA20 (${maShort}) & EMA50 (${maLong}), didukung RSI ${rsi} dalam momentum ekspansi sehat.`;
      } else if (rsi > 68 && currentPrice <= resistance * 1.01) {
        calcSignal = 'SELL';
        calcConfidence = 82;
        calcTarget = roundVal(currentPrice - Math.abs(currentPrice - support) * 0.85 || currentPrice * 0.965);
        calcStop = roundVal(resistance * 1.006 || currentPrice * 1.015);
        calcReason = `RSI di level ${rsi} memasuki zona overbought di area resistance ${resistance}, menandakan potensi koreksi pullback jangka pendek.`;
      } else if (maShort < maLong && currentPrice < maShort) {
        calcSignal = 'SELL';
        calcConfidence = 85;
        calcTarget = roundVal(currentPrice * 0.962);
        calcStop = roundVal(maShort * 1.006);
        calcReason = `Tekanan jual dominan akibat Death Cross (EMA20 di bawah EMA50) dan harga ditolak di bawah resistensi rata-rata bergerak.`;
      } else {
        calcSignal = 'WAIT';
        calcConfidence = 68;
        calcTarget = roundVal(resistance);
        calcStop = roundVal(support);
        calcReason = `RSI di level netral (${rsi}) dengan pergerakan harga terjepit antara EMA20 (${maShort}) dan EMA50 (${maLong}). Disarankan menunggu konfirmasi breakout.`;
      }

      aiResult = {
        signal: calcSignal,
        confidence: calcConfidence,
        targetPrice: calcTarget,
        stopLoss: calcStop,
        reason: calcReason,
        indicators: {
          rsi,
          maShort,
          maLong,
          trend,
        },
        symbol,
        currentPrice,
        timeframe,
        provider: 'algo-engine',
        analyzedAt: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      };
      usedProvider = 'algo-engine';
    }

    // 5. Kembalikan output JSON sesuai spesifikasi
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
