import assert from 'node:assert';
import {
  calculateRSI,
  calculateEMA,
  calculateMACD,
  calculateATR,
  calculateBollingerBands,
  analyzeTechnicalIndicators,
} from '../src/lib/indicators';
import {
  getWatchlistItems,
  addWatchlistItem,
  removeWatchlistItem,
  getTradeJournals,
  createTradeJournal,
  closeTradeJournal,
  deleteTradeJournal,
} from '../src/lib/db';
import { CandleData } from '../src/types/market';

async function runQuantAndDbCheck() {
  console.log('--- 1. Testing Quantitative Indicator Engine ---');

  // Generate 60 test candles with clear upward trend
  const testCandles: CandleData[] = Array.from({ length: 60 }, (_, i) => {
    const base = 100 + i * 1.5;
    return {
      time: `10:${i.toString().padStart(2, '0')}`,
      timestamp: 1700000000 + i * 3600,
      open: base,
      high: base + 2.5,
      low: base - 1.0,
      close: base + 1.8,
      volume: 1000 + i * 10,
      color: 'bull',
    };
  });

  const closes = testCandles.map((c) => c.close);

  const rsi = calculateRSI(closes, 14);
  console.log('RSI (14):', rsi);
  assert(rsi >= 0 && rsi <= 100, 'RSI must be between 0 and 100');
  assert(rsi > 60, 'Uptrend RSI should be bullish (> 60)');

  const ema20 = calculateEMA(closes, 20);
  const ema50 = calculateEMA(closes, 50);
  console.log('EMA 20:', ema20, 'EMA 50:', ema50);
  assert(ema20 > ema50, 'In uptrend, EMA20 must be > EMA50');

  const macd = calculateMACD(closes);
  console.log('MACD:', macd);
  assert(macd.macd > 0, 'In steady uptrend, MACD line should be positive');

  const atr = calculateATR(testCandles, 14);
  console.log('ATR (14):', atr);
  assert(atr > 0, 'ATR must be positive');

  const bb = calculateBollingerBands(closes, 20, 2);
  console.log('Bollinger Bands:', bb);
  assert(bb.upper > bb.middle && bb.middle > bb.lower, 'Upper > Middle > Lower in Bollinger Bands');

  const analysis = analyzeTechnicalIndicators(testCandles, 2);
  console.log('Quantitative Confluence Analysis:');
  console.log(' - Signal:', analysis.recommendedSignal);
  console.log(' - Confidence:', analysis.confidence + '%');
  console.log(' - Confluence Score:', analysis.confluenceScore);
  console.log(' - Risk:Reward:', `1:${analysis.riskRewardRatio}`);
  console.log(' - Target:', analysis.targetPrice, 'StopLoss:', analysis.stopLoss);
  console.log(' - Reason:', analysis.reason);

  // Test BUY setup: Pullback in uptrend (RSI ~ 38, bouncing off EMA 50)
  const buyCandles: CandleData[] = Array.from({ length: 60 }, (_, i) => {
    // Uptrend with mild healthy dip near the end
    let close = 100 + i * 1.0;
    if (i > 45) {
      close = 145 - (i - 45) * 0.4; // dip to 139
    }
    if (i >= 58) {
      close = 139 + (i - 57) * 1.5; // bounce up
    }
    return {
      time: `11:${i.toString().padStart(2, '0')}`,
      timestamp: 1700000000 + i * 3600,
      open: close - 0.5,
      high: close + 1.2,
      low: close - 0.8,
      close,
      volume: 1500,
      color: 'bull',
    };
  });

  const buyAnalysis = analyzeTechnicalIndicators(buyCandles, 2);
  console.log('Buy Setup Analysis:');
  console.log(' - Signal:', buyAnalysis.recommendedSignal);
  console.log(' - Confluence Score:', buyAnalysis.confluenceScore);
  console.log(' - R:R:', `1:${buyAnalysis.riskRewardRatio}`);
  console.log(' - Target:', buyAnalysis.targetPrice, 'StopLoss:', buyAnalysis.stopLoss);
  if (buyAnalysis.recommendedSignal === 'BUY') {
    assert(buyAnalysis.riskRewardRatio >= 1.6, 'BUY R:R must be >= 1.6');
    assert(buyAnalysis.stopLoss < buyAnalysis.currentPrice, 'BUY SL must be below currentPrice');
    assert(buyAnalysis.targetPrice > buyAnalysis.currentPrice, 'BUY TP must be above currentPrice');
  }

  console.log('--- 2. Testing Database Watchlist Persistence ---');
  const initialWatchlist = await getWatchlistItems();
  assert(Array.isArray(initialWatchlist), 'Watchlist must be an array');
  assert(initialWatchlist.length > 0, 'Watchlist should have items');

  const testSym = 'SOL/USD';
  const added = await addWatchlistItem({
    symbol: testSym,
    name: 'Solana Test',
    type: 'crypto',
    notes: 'Test item for persistence check',
    alertPrice: 200,
  });
  console.log('Added Watchlist Item:', added.symbol, added.id);
  assert(added.symbol === testSym, 'Added symbol must match');

  const watchlistAfterAdd = await getWatchlistItems();
  assert(watchlistAfterAdd.some((w) => w.symbol === testSym), 'Watchlist must contain newly added item');

  const removed = await removeWatchlistItem(testSym);
  console.log('Removed Watchlist Item status:', removed);
  assert(removed === true, 'Remove should succeed');

  console.log('--- 3. Testing Database Trade Journal Persistence & Evaluation ---');
  const initialJournals = await getTradeJournals();
  assert(Array.isArray(initialJournals), 'Journals must be an array');

  const createdTrade = await createTradeJournal({
    symbol: 'BTC/USD',
    type: 'crypto',
    direction: 'LONG',
    entryPrice: 85000,
    stopLoss: 83500,
    takeProfit: 88500,
    positionSize: 10000,
    timeframe: '1h',
    aiSignalUsed: true,
    aiConfidence: 88,
    strategy: 'Quantitative Confluence Test',
    notes: 'Self-check test entry',
    tags: ['Test', 'SelfCheck'],
  });
  console.log('Created Trade Journal Entry:', createdTrade.id, createdTrade.symbol);
  assert(createdTrade.id, 'Trade must have an ID');
  assert(createdTrade.status === 'OPEN', 'Initial status must be OPEN');
  assert(createdTrade.riskRewardRatio && createdTrade.riskRewardRatio >= 1.5, 'R:R should be >= 1.5');

  // Close the trade with profit (Win)
  const closedTrade = await closeTradeJournal(createdTrade.id, 88000, 'Hit near TP target');
  console.log('Closed Trade Journal Entry:', closedTrade?.status, 'PnL:', closedTrade?.pnl, 'Outcome:', closedTrade?.outcome);
  assert(closedTrade !== null, 'Closed trade must not be null');
  assert(closedTrade.status === 'CLOSED', 'Status must be CLOSED');
  assert(closedTrade.outcome === 'WIN', 'Outcome must be WIN');
  assert(closedTrade.pnl && closedTrade.pnl > 0, 'PnL must be positive');

  // Cleanup: delete test trade
  const deleted = await deleteTradeJournal(createdTrade.id);
  console.log('Deleted Trade status:', deleted);
  assert(deleted === true, 'Delete must return true');

  console.log('ALL QUANTITATIVE & PERSISTENCE TESTS PASSED!');
}

runQuantAndDbCheck().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
