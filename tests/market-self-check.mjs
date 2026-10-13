import assert from 'node:assert';
import {
  fetchLiveCryptoTickers,
  fetchKlines,
  calculateEMA,
  calculateRSI,
  formatVolume,
} from '../src/services/marketApi.ts';

async function runSelfCheck() {
  console.log('Testing formatVolume...');
  assert.strictEqual(formatVolume(1.5e9), '$1.5B');
  assert.strictEqual(formatVolume(450e6), '$450.0M');
  assert.strictEqual(formatVolume(25e3), '$25.0K');

  console.log('Testing calculateEMA...');
  const sampleCandles = Array.from({ length: 60 }, (_, i) => ({
    time: 1000 + i * 60,
    open: 100 + i,
    high: 105 + i,
    low: 95 + i,
    close: 100 + i,
    volume: 1000,
  }));
  const ema20 = calculateEMA(sampleCandles, 20);
  assert(ema20.length === 41, `Expected 41 EMA points, got ${ema20.length}`);
  assert(ema20[0].time === 1000 + 19 * 60);

  console.log('Testing calculateRSI...');
  const rsi = calculateRSI(sampleCandles, 14);
  assert(rsi.length > 0, 'RSI should produce points');
  assert(rsi[0].value >= 0 && rsi[0].value <= 100, 'RSI must be bounded [0, 100]');

  console.log('Testing fetchLiveCryptoTickers from live endpoint...');
  const tickers = await fetchLiveCryptoTickers();
  assert(typeof tickers === 'object', 'Tickers must be an object');
  if (tickers['btc-usd']) {
    assert(tickers['btc-usd'].price > 10000, 'BTC price should be realistic');
    console.log('Live BTC Price:', tickers['btc-usd'].price, '24h Change:', tickers['btc-usd'].change24h + '%');
  }

  console.log('Testing fetchKlines for BTC/USD...');
  const klines = await fetchKlines(
    {
      id: 'btc-usd',
      symbol: 'BTC/USD',
      name: 'Bitcoin',
      type: 'crypto',
      price: 85000,
      change24h: 1,
      high24h: 86000,
      low24h: 84000,
      volume24h: '$40B',
      sparkline: [],
      decimals: 2,
    },
    '1h',
    20
  );
  assert(Array.isArray(klines), 'Klines must be array');
  assert(klines.length > 0, 'Klines must not be empty');
  // Check timestamps strictly ascending
  for (let i = 1; i < klines.length; i++) {
    assert(klines[i].time > klines[i - 1].time, `Timestamps must be strictly ascending: ${klines[i].time} > ${klines[i - 1].time}`);
  }

  console.log('ALL SELF-CHECKS PASSED!');
}

runSelfCheck().catch((err) => {
  console.error('Self check failed:', err);
  process.exit(1);
});
