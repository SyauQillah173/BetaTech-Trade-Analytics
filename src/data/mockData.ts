import { Instrument, CandleData, AISignal, OrderBookLevel, RecentTrade } from '../types/market';

export const INITIAL_INSTRUMENTS: Instrument[] = [
  {
    id: 'btc-usd',
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    type: 'crypto',
    price: 81790.8,
    change24h: -1.79,
    high24h: 84005.72,
    low24h: 81543.8,
    volume24h: '$38.4B',
    sparkline: [81543.8, 82405.47, 83267.14, 84005.72, 82898.26, 81790.8],
    decimals: 2,
    isFavorite: true,
  },
  {
    id: 'eth-usd',
    symbol: 'ETH/USD',
    name: 'Ethereum',
    type: 'crypto',
    price: 2441.18,
    change24h: -2.74,
    high24h: 2523.05,
    low24h: 2416.07,
    volume24h: '$17.2B',
    sparkline: [2416.07, 2453.51, 2490.96, 2523.05, 2482.11, 2441.18],
    decimals: 2,
    isFavorite: true,
  },
  {
    id: 'sol-usd',
    symbol: 'SOL/USD',
    name: 'Solana',
    type: 'crypto',
    price: 104.67,
    change24h: -2.59,
    high24h: 108.3,
    low24h: 103.52,
    volume24h: '$4.1B',
    sparkline: [103.52, 105.19, 106.87, 108.3, 106.48, 104.67],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'eur-usd',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    type: 'forex',
    price: 1.1125,
    change24h: -0.7,
    high24h: 1.1215,
    low24h: 1.1117,
    volume24h: '$118.5B',
    sparkline: [1.1117, 1.1151, 1.1186, 1.1215, 1.117, 1.1125],
    decimals: 4,
    isFavorite: true,
  },
  {
    id: 'gbp-usd',
    symbol: 'GBP/USD',
    name: 'British Pound / USD',
    type: 'forex',
    price: 1.3154,
    change24h: -0.73,
    high24h: 1.3275,
    low24h: 1.3139,
    volume24h: '$82.4B',
    sparkline: [1.3139, 1.3187, 1.3234, 1.3275, 1.3215, 1.3154],
    decimals: 4,
    isFavorite: true,
  },
  {
    id: 'usd-jpy',
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    type: 'forex',
    price: 158.73,
    change24h: 0.26,
    high24h: 158.95,
    low24h: 158.11,
    volume24h: '$96.1B',
    sparkline: [158.11, 158.4, 158.7, 158.95, 158.84, 158.73],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'xau-usd',
    symbol: 'XAU/USD',
    name: 'Gold Spot',
    type: 'commodities',
    price: 4104.0,
    change24h: -1.75,
    high24h: 4193.5,
    low24h: 4095.0,
    volume24h: '$34.2B',
    sparkline: [4095.0, 4129.48, 4163.95, 4193.5, 4148.75, 4104.0],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'bnb-usd',
    symbol: 'BNB/USD',
    name: 'BNB Chain',
    type: 'crypto',
    price: 730.8,
    change24h: -1.69,
    high24h: 745.74,
    low24h: 727.98,
    volume24h: '$1.6B',
    sparkline: [727.98, 734.2, 740.41, 745.74, 738.27, 730.8],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'aud-usd',
    symbol: 'AUD/USD',
    name: 'Australian Dollar / USD',
    type: 'forex',
    price: 0.696,
    change24h: -0.33,
    high24h: 0.7015,
    low24h: 0.6953,
    volume24h: '$46.8B',
    sparkline: [0.6953, 0.6975, 0.6996, 0.7015, 0.6987, 0.696],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'usd-cad',
    symbol: 'USD/CAD',
    name: 'US Dollar / Canadian Dollar',
    type: 'forex',
    price: 1.4266,
    change24h: 0.35,
    high24h: 1.43,
    low24h: 1.4193,
    volume24h: '$38.2B',
    sparkline: [1.4193, 1.423, 1.4268, 1.43, 1.4283, 1.4266],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'usd-chf',
    symbol: 'USD/CHF',
    name: 'US Dollar / Swiss Franc',
    type: 'forex',
    price: 0.8384,
    change24h: 0.73,
    high24h: 0.8395,
    low24h: 0.8317,
    volume24h: '$29.5B',
    sparkline: [0.8317, 0.8344, 0.8372, 0.8395, 0.839, 0.8384],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'nzd-usd',
    symbol: 'NZD/USD',
    name: 'New Zealand Dollar / USD',
    type: 'forex',
    price: 0.5575,
    change24h: -0.65,
    high24h: 0.5631,
    low24h: 0.5568,
    volume24h: '$24.1B',
    sparkline: [0.5568, 0.559, 0.5612, 0.5631, 0.5603, 0.5575],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'eur-gbp',
    symbol: 'EUR/GBP',
    name: 'Euro / British Pound',
    type: 'forex',
    price: 0.8456,
    change24h: 0.1,
    high24h: 0.8459,
    low24h: 0.8426,
    volume24h: '$16.3B',
    sparkline: [0.8426, 0.8438, 0.8449, 0.8459, 0.8458, 0.8456],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'eur-jpy',
    symbol: 'EUR/JPY',
    name: 'Euro / Japanese Yen',
    type: 'forex',
    price: 176.55,
    change24h: -0.39,
    high24h: 177.59,
    low24h: 176.38,
    volume24h: '$22.7B',
    sparkline: [176.38, 176.8, 177.23, 177.59, 177.07, 176.55],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'gbp-jpy',
    symbol: 'GBP/JPY',
    name: 'British Pound / Japanese Yen',
    type: 'forex',
    price: 208.8,
    change24h: -0.42,
    high24h: 210.3,
    low24h: 208.58,
    volume24h: '$18.5B',
    sparkline: [208.58, 209.18, 209.78, 210.3, 209.55, 208.8],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'xag-usd',
    symbol: 'XAG/USD',
    name: 'Silver Spot',
    type: 'commodities',
    price: 55.89,
    change24h: -6.11,
    high24h: 59.595,
    low24h: 55.695,
    volume24h: '$8.4B',
    sparkline: [55.695, 57.06, 58.425, 59.595, 57.742, 55.89],
    decimals: 3,
    isFavorite: false,
  },
  {
    id: 'wti-usd',
    symbol: 'WTI/USD',
    name: 'Crude Oil WTI',
    type: 'commodities',
    price: 95.77,
    change24h: 1.73,
    high24h: 95.99,
    low24h: 93.97,
    volume24h: '$12.6B',
    sparkline: [93.97, 94.68, 95.38, 95.99, 95.88, 95.77],
    decimals: 2,
    isFavorite: false,
  },
];

export const AI_SIGNALS_DATA: AISignal[] = [
  {
    id: 'sig-btc-01',
    symbol: 'BTC/USD',
    action: 'STRONG BUY',
    confidence: 91,
    timeframe: '4H',
    entryZone: '$81,693 - $81,889',
    entryPrice: 81790.8,
    target1: 84735.27,
    target2: 87090.84,
    stopLoss: 80318.57,
    rrRatio: '1 : 3.6',
    pattern: 'Wyckoff Spring + Bullish Order Block Re-test',
    indicators: ["RSI Hidden Bullish Divergence", "EMA Ribbon 20/50 Golden Cross", "Whale Inflow Spike (+14.2k BTC)"],
    model: 'AlphaPulse Neural v4.2',
    timestamp: '14 min ago',
    status: 'ACTIVE',
    accuracyRate: '87.4%',
  },
  {
    id: 'sig-eth-02',
    symbol: 'ETH/USD',
    action: 'BUY',
    confidence: 84,
    timeframe: '1H',
    entryZone: '$2,438 - $2,444',
    entryPrice: 2441.18,
    target1: 2524.18,
    target2: 2557.38,
    stopLoss: 2399.68,
    rrRatio: '1 : 2.8',
    pattern: 'Ascending Triangle Breakout',
    indicators: ["Volume Profile POC Hold", "MACD Bullish Expansion", "Stochastic RSI Oversold Bounce"],
    model: 'DeepFlow Multi-TF v3.1',
    timestamp: '32 min ago',
    status: 'ACTIVE',
    accuracyRate: '82.1%',
  },
  {
    id: 'sig-eur-03',
    symbol: 'EUR/USD',
    action: 'BUY',
    confidence: 79,
    timeframe: '15m',
    entryZone: '1.1112 - 1.1138',
    entryPrice: 1.1125,
    target1: 1.1158,
    target2: 1.117,
    stopLoss: 1.1109,
    rrRatio: '1 : 2.9',
    pattern: 'Liquidity Sweep at London Session Open',
    indicators: ["ECB Liquidity Influx", "Fair Value Gap Fill", "VWAP Upper Band Bounce"],
    model: 'FX-MacroQuant Pro',
    timestamp: '1 hour ago',
    status: 'TARGET 1 HIT',
    accuracyRate: '79.5%',
  },
  {
    id: 'sig-gbp-04',
    symbol: 'GBP/USD',
    action: 'SELL',
    confidence: 76,
    timeframe: '1H',
    entryZone: '1.3138 - 1.317',
    entryPrice: 1.3154,
    target1: 1.3117,
    target2: 1.3103,
    stopLoss: 1.3174,
    rrRatio: '1 : 2.6',
    pattern: 'Bearish Head & Shoulders Right Shoulder Rejection',
    indicators: ["Bearish Divergence on 1H RSI", "UK CPI Reaction Level", "Bollinger Upper Squeeze"],
    model: 'FX-MacroQuant Pro',
    timestamp: '2 hours ago',
    status: 'ACTIVE',
    accuracyRate: '75.8%',
  },
  {
    id: 'sig-sol-05',
    symbol: 'SOL/USD',
    action: 'STRONG BUY',
    confidence: 88,
    timeframe: '4H',
    entryZone: '$105 - $105',
    entryPrice: 104.67,
    target1: 108.86,
    target2: 111.79,
    stopLoss: 102.58,
    rrRatio: '1 : 3.4',
    pattern: 'Cup & Handle Continuation Pattern',
    indicators: ["DEX Volume Record High", "Funding Rate Equilibrium", "SuperTrend Green Signal"],
    model: 'AlphaPulse Neural v4.2',
    timestamp: '3 hours ago',
    status: 'ACTIVE',
    accuracyRate: '86.2%',
  },
];

export function generateCandleData(basePrice: number, timeframe: string, count: number = 48): CandleData[] {
  const candles: CandleData[] = [];
  let currentClose = basePrice * 0.96;
  const baseTime = 1728800000000;
  
  const tfMinutes: Record<string, number> = {
    '1m': 1,
    '5m': 5,
    '15m': 15,
    '1h': 60,
    '4h': 240,
    '1d': 1440,
    '1w': 10080,
  };
  
  const stepMs = (tfMinutes[timeframe] || 60) * 60 * 1000;
  const startTime = baseTime - count * stepMs;
  
  const volatility = basePrice > 1000 ? 0.008 : basePrice > 10 ? 0.012 : 0.002;

  for (let i = 0; i < count; i++) {
    const trendFactor = Math.sin(i / 6) * 0.004 + (i > count - 8 ? 0.003 : -0.001);
    const pseudoRandom = (Math.sin(i * 99 + basePrice) + 1) / 2;
    const change = (pseudoRandom - 0.48 + trendFactor) * volatility * currentClose;
    
    const open = currentClose;
    const close = Math.max(open + change, 0.0001);
    const highWick = ((Math.sin(i * 33) + 1) / 2) * volatility * 0.6 * open;
    const lowWick = ((Math.cos(i * 44) + 1) / 2) * volatility * 0.6 * open;
    
    const high = Math.max(open, close) + highWick;
    const low = Math.min(open, close) - lowWick;
    
    const volumeBase = basePrice > 1000 ? 120 : basePrice > 10 ? 4500 : 850000;
    const volume = Math.floor((((Math.sin(i * 12) + 1) / 2) * 0.8 + 0.6) * volumeBase * (1 + Math.abs(change) / (open * 0.01)));
    
    currentClose = close;
    
    const hour = String(Math.floor((i * (tfMinutes[timeframe] || 60) / 60) % 24)).padStart(2, '0');
    const min = String((i * (tfMinutes[timeframe] || 60)) % 60).padStart(2, '0');
    const timeFormatted = timeframe === '1d' || timeframe === '1w' ? `Day ${i + 1}` : `${hour}:${min}`;

    candles.push({
      time: timeFormatted,
      timestamp: startTime + i * stepMs,
      open: parseFloat(open.toFixed(basePrice < 10 ? 4 : 2)),
      high: parseFloat(high.toFixed(basePrice < 10 ? 4 : 2)),
      low: parseFloat(low.toFixed(basePrice < 10 ? 4 : 2)),
      close: parseFloat(close.toFixed(basePrice < 10 ? 4 : 2)),
      volume,
      color: close >= open ? 'bull' : 'bear',
    });
  }

  // Adjust last close to match exact basePrice
  if (candles.length > 0) {
    const last = candles[candles.length - 1];
    last.close = basePrice;
    last.high = Math.max(last.high, basePrice);
    last.low = Math.min(last.low, basePrice);
    last.color = last.close >= last.open ? 'bull' : 'bear';
  }

  return candles;
}

export function generateOrderBook(currentPrice: number, decimals: number): { bids: OrderBookLevel[], asks: OrderBookLevel[] } {
  const bids: OrderBookLevel[] = [];
  const asks: OrderBookLevel[] = [];
  const step = currentPrice * (decimals > 2 ? 0.0003 : 0.0005);
  
  let cumBidTotal = 0;
  for (let i = 1; i <= 8; i++) {
    const price = currentPrice - i * step;
    const size = parseFloat(((((Math.sin(i * 7) + 1) / 2) * 1.8 + 0.4) * (currentPrice > 1000 ? 1.2 : 50)).toFixed(decimals > 2 ? 1 : 3));
    cumBidTotal += size;
    bids.push({
      price: parseFloat(price.toFixed(decimals)),
      size,
      total: parseFloat(cumBidTotal.toFixed(decimals > 2 ? 1 : 3)),
      depthPct: Math.min(100, Math.round((cumBidTotal / 25) * 100)),
    });
  }

  let cumAskTotal = 0;
  for (let i = 1; i <= 8; i++) {
    const price = currentPrice + i * step;
    const size = parseFloat(((((Math.cos(i * 11) + 1) / 2) * 1.8 + 0.4) * (currentPrice > 1000 ? 1.2 : 50)).toFixed(decimals > 2 ? 1 : 3));
    cumAskTotal += size;
    asks.push({
      price: parseFloat(price.toFixed(decimals)),
      size,
      total: parseFloat(cumAskTotal.toFixed(decimals > 2 ? 1 : 3)),
      depthPct: Math.min(100, Math.round((cumAskTotal / 25) * 100)),
    });
  }

  return { bids, asks };
}

export function generateRecentTrades(currentPrice: number, decimals: number): RecentTrade[] {
  const trades: RecentTrade[] = [];
  const sides: ('buy' | 'sell')[] = ['buy', 'sell', 'buy', 'buy', 'sell', 'buy', 'sell', 'buy', 'sell'];

  for (let i = 0; i < 9; i++) {
    const pseudoDelta = (Math.sin(i * 19) * 0.0008) * currentPrice;
    const price = currentPrice + pseudoDelta;
    const size = parseFloat(((((Math.cos(i * 23) + 1) / 2) * 0.9 + 0.1) * (currentPrice > 1000 ? 0.8 : 35)).toFixed(decimals > 2 ? 1 : 3));
    const side = sides[i % sides.length];
    const sec = String((58 - i * 6 + 60) % 60).padStart(2, '0');

    trades.push({
      id: `trade-${i}-${price.toFixed(2)}`,
      price: parseFloat(price.toFixed(decimals)),
      size,
      time: `14:32:${sec}`,
      side,
    });
  }

  return trades;
}