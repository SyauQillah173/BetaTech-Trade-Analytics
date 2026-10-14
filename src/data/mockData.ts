import { Instrument, CandleData, AISignal, OrderBookLevel, RecentTrade } from '../types/market';

export const INITIAL_INSTRUMENTS: Instrument[] = [
  {
    id: 'btc-usd',
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    type: 'crypto',
    price: 89420.50,
    change24h: 3.42,
    high24h: 90850.00,
    low24h: 86320.10,
    volume24h: '$42.8B',
    sparkline: [86320, 86800, 87400, 86900, 88100, 88900, 89420],
    decimals: 2,
    isFavorite: true,
  },
  {
    id: 'eth-usd',
    symbol: 'ETH/USD',
    name: 'Ethereum',
    type: 'crypto',
    price: 3385.75,
    change24h: 2.18,
    high24h: 3450.00,
    low24h: 3290.40,
    volume24h: '$19.4B',
    sparkline: [3290, 3310, 3340, 3320, 3365, 3370, 3385],
    decimals: 2,
    isFavorite: true,
  },
  {
    id: 'sol-usd',
    symbol: 'SOL/USD',
    name: 'Solana',
    type: 'crypto',
    price: 198.40,
    change24h: 5.84,
    high24h: 204.20,
    low24h: 186.50,
    volume24h: '$7.8B',
    sparkline: [186, 189, 192, 190, 195, 197, 198.4],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'eur-usd',
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    type: 'forex',
    price: 1.0846,
    change24h: 0.28,
    high24h: 1.0872,
    low24h: 1.0815,
    volume24h: '$112.5B',
    sparkline: [1.0815, 1.0825, 1.0840, 1.0830, 1.0842, 1.0846],
    decimals: 4,
    isFavorite: true,
  },
  {
    id: 'gbp-usd',
    symbol: 'GBP/USD',
    name: 'British Pound / USD',
    type: 'forex',
    price: 1.2985,
    change24h: -0.34,
    high24h: 1.3045,
    low24h: 1.2960,
    volume24h: '$78.3B',
    sparkline: [1.3045, 1.3020, 1.2995, 1.3005, 1.2980, 1.2985],
    decimals: 4,
    isFavorite: true,
  },
  {
    id: 'usd-jpy',
    symbol: 'USD/JPY',
    name: 'US Dollar / Japanese Yen',
    type: 'forex',
    price: 152.48,
    change24h: -0.45,
    high24h: 153.20,
    low24h: 151.90,
    volume24h: '$95.1B',
    sparkline: [153.20, 152.90, 152.60, 152.80, 152.30, 152.48],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'xau-usd',
    symbol: 'XAU/USD',
    name: 'Gold Spot',
    type: 'commodities',
    price: 2748.90,
    change24h: 1.15,
    high24h: 2762.00,
    low24h: 2724.50,
    volume24h: '$34.2B',
    sparkline: [2724, 2735, 2742, 2738, 2750, 2748.9],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'bnb-usd',
    symbol: 'BNB/USD',
    name: 'BNB Chain',
    type: 'crypto',
    price: 612.30,
    change24h: -1.12,
    high24h: 624.50,
    low24h: 608.20,
    volume24h: '$1.4B',
    sparkline: [624, 620, 615, 617, 610, 612.3],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'aud-usd',
    symbol: 'AUD/USD',
    name: 'Australian Dollar / USD',
    type: 'forex',
    price: 0.6654,
    change24h: 0.15,
    high24h: 0.6678,
    low24h: 0.6632,
    volume24h: '$31.6B',
    sparkline: [0.6632, 0.6645, 0.6650, 0.6640, 0.6654],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'usd-cad',
    symbol: 'USD/CAD',
    name: 'US Dollar / Canadian Dollar',
    type: 'forex',
    price: 1.3645,
    change24h: -0.22,
    high24h: 1.3680,
    low24h: 1.3610,
    volume24h: '$38.2B',
    sparkline: [1.3680, 1.3665, 1.3650, 1.3660, 1.3645],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'usd-chf',
    symbol: 'USD/CHF',
    name: 'US Dollar / Swiss Franc',
    type: 'forex',
    price: 0.8812,
    change24h: 0.08,
    high24h: 0.8840,
    low24h: 0.8790,
    volume24h: '$29.5B',
    sparkline: [0.8790, 0.8800, 0.8815, 0.8808, 0.8812],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'nzd-usd',
    symbol: 'NZD/USD',
    name: 'New Zealand Dollar / USD',
    type: 'forex',
    price: 0.6145,
    change24h: 0.12,
    high24h: 0.6168,
    low24h: 0.6125,
    volume24h: '$24.1B',
    sparkline: [0.6125, 0.6135, 0.6140, 0.6138, 0.6145],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'eur-gbp',
    symbol: 'EUR/GBP',
    name: 'Euro / British Pound',
    type: 'forex',
    price: 0.8350,
    change24h: 0.05,
    high24h: 0.8372,
    low24h: 0.8330,
    volume24h: '$16.3B',
    sparkline: [0.8330, 0.8340, 0.8348, 0.8345, 0.8350],
    decimals: 4,
    isFavorite: false,
  },
  {
    id: 'eur-jpy',
    symbol: 'EUR/JPY',
    name: 'Euro / Japanese Yen',
    type: 'forex',
    price: 163.25,
    change24h: -0.18,
    high24h: 163.80,
    low24h: 162.90,
    volume24h: '$22.7B',
    sparkline: [163.80, 163.50, 163.30, 163.40, 163.25],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'gbp-jpy',
    symbol: 'GBP/JPY',
    name: 'British Pound / Japanese Yen',
    type: 'forex',
    price: 195.40,
    change24h: -0.25,
    high24h: 196.10,
    low24h: 195.00,
    volume24h: '$18.5B',
    sparkline: [196.10, 195.80, 195.50, 195.60, 195.40],
    decimals: 2,
    isFavorite: false,
  },
  {
    id: 'xag-usd',
    symbol: 'XAG/USD',
    name: 'Silver Spot',
    type: 'commodities',
    price: 30.85,
    change24h: 0.72,
    high24h: 31.10,
    low24h: 30.50,
    volume24h: '$8.4B',
    sparkline: [30.50, 30.60, 30.75, 30.70, 30.85],
    decimals: 3,
    isFavorite: false,
  },
  {
    id: 'wti-usd',
    symbol: 'WTI/USD',
    name: 'Crude Oil WTI',
    type: 'commodities',
    price: 72.45,
    change24h: -0.55,
    high24h: 73.20,
    low24h: 72.10,
    volume24h: '$12.6B',
    sparkline: [73.20, 72.90, 72.60, 72.70, 72.45],
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
    entryZone: '$88,900 - $89,300',
    entryPrice: 89100,
    target1: 91450,
    target2: 93800,
    stopLoss: 87800,
    rrRatio: '1 : 3.6',
    pattern: 'Wyckoff Spring + Bullish Order Block Re-test',
    indicators: ['RSI Hidden Bullish Divergence', 'EMA Ribbon 20/50 Golden Cross', 'Whale Inflow Spike (+14.2k BTC)'],
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
    entryZone: '$3,360 - $3,380',
    entryPrice: 3370,
    target1: 3480,
    target2: 3560,
    stopLoss: 3310,
    rrRatio: '1 : 2.8',
    pattern: 'Ascending Triangle Breakout',
    indicators: ['Volume Profile POC Hold', 'MACD Bullish Expansion', 'Stochastic RSI Oversold Bounce'],
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
    entryZone: '1.0835 - 1.0842',
    entryPrice: 1.0840,
    target1: 1.0875,
    target2: 1.0898,
    stopLoss: 1.0820,
    rrRatio: '1 : 2.9',
    pattern: 'Liquidity Sweep at London Session Open',
    indicators: ['ECB Liquidity Influx', 'Fair Value Gap Fill', 'VWAP Upper Band Bounce'],
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
    entryZone: '1.2990 - 1.3010',
    entryPrice: 1.3000,
    target1: 1.2940,
    target2: 1.2910,
    stopLoss: 1.3035,
    rrRatio: '1 : 2.6',
    pattern: 'Bearish Head & Shoulders Right Shoulder Rejection',
    indicators: ['Bearish Divergence on 1H RSI', 'UK CPI Reaction Level', 'Bollinger Upper Squeeze'],
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
    entryZone: '$193.00 - $196.50',
    entryPrice: 195.00,
    target1: 208.00,
    target2: 218.00,
    stopLoss: 189.50,
    rrRatio: '1 : 3.4',
    pattern: 'Cup & Handle Continuation Pattern',
    indicators: ['DEX Volume Record High', 'Funding Rate Equilibrium', 'SuperTrend Green Signal'],
    model: 'AlphaPulse Neural v4.2',
    timestamp: '3 hours ago',
    status: 'ACTIVE',
    accuracyRate: '86.2%',
  }
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
