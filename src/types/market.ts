export type MarketType = 'all' | 'crypto' | 'forex' | 'commodities';

export interface Instrument {
  id: string;
  symbol: string;
  name: string;
  type: 'crypto' | 'forex' | 'commodities';
  price: number;
  change24h: number;
  high24h: number;
  low24h: number;
  volume24h: string;
  sparkline: number[];
  decimals: number;
  isFavorite?: boolean;
}

export type Timeframe = '1m' | '5m' | '15m' | '1h' | '4h' | '1d' | '1w';

export interface CandleData {
  time: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  color?: 'bull' | 'bear';
}

export interface MarketSignal {
  id: string;
  symbol: string;
  instrumentId: string;
  assetType: 'crypto' | 'forex' | 'commodities';
  direction: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  setup: string;
  timeframe: string;
  strength: 'STRONG' | 'MODERATE' | 'EARLY';
  price: number;
  targetPrice: number;
  invalidationPrice: number;
  timeAgo: string;
  rationale: string;
  indicators: string[];
}

export interface TechnicalOverview {
  bias: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
  score: number;
  rsi14: number;
  rsiStatus: 'OVERSOLD' | 'NEUTRAL' | 'OVERBOUGHT';
  emaTrend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  volatilityPct: number;
  pivot: number;
  r1: number;
  r2: number;
  r3: number;
  s1: number;
  s2: number;
  s3: number;
}

export interface AISignal {
  id: string;
  symbol: string;
  action: 'STRONG BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG SELL';
  confidence: number;
  timeframe: string;
  entryZone: string;
  entryPrice: number;
  target1: number;
  target2: number;
  stopLoss: number;
  rrRatio: string;
  pattern: string;
  indicators: string[];
  model: string;
  timestamp: string;
  status: 'ACTIVE' | 'TARGET 1 HIT' | 'TARGET 2 HIT' | 'INVALIDATED';
  accuracyRate: string;
}

export interface OrderBookLevel {
  price: number;
  size: number;
  total: number;
  depthPct: number;
}

export interface RecentTrade {
  id: string;
  price: number;
  size: number;
  time: string;
  side: 'buy' | 'sell';
}

export interface Position {
  id: string;
  symbol: string;
  side: 'LONG' | 'SHORT';
  size: number;
  entryPrice: number;
  currentPrice: number;
  pnl: number;
  pnlPct: number;
  stopLoss: number;
  takeProfit: number;
  timestamp: string;
}

export interface GeneratedAISignal {
  signal: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
  targetPrice: number;
  stopLoss: number;
  riskRewardRatio?: number;
  reason: string;
  indicators: {
    rsi: number;
    rsiStatus?: string;
    maShort: number;
    maLong: number;
    maTrend?: string;
    trend: string;
    macd?: {
      macd: number;
      signal: number;
      histogram: number;
      trend: 'BULLISH' | 'BEARISH' | 'NEUTRAL';
    };
    atr?: number;
    bollinger?: {
      upper: number;
      middle: number;
      lower: number;
      percentB: number;
    };
    confluenceScore?: number;
    support?: number;
    resistance?: number;
  };
  symbol: string;
  currentPrice: number;
  timeframe: string;
  provider: 'gemini' | 'openai' | 'algo-engine';
  analyzedAt: string;
}

