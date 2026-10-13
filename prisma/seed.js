const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('--- SEEDING NEON POSTGRESQL DATABASE ---');

  // 1. Get or Create Default User
  let user = await prisma.user.findFirst();
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: 'trader@betatech.analytics',
        name: 'BetaTech Pro Trader',
        balance: 100000.0,
      },
    });
    console.log('✓ User created:', user.email);
  } else {
    console.log('✓ Existing user found:', user.email);
  }

  // 2. Seed Initial Watchlist Items
  const initialWatchlist = [
    {
      symbol: 'BTC/USD',
      name: 'Bitcoin',
      type: 'crypto',
      notes: 'Core holding, support $88k',
      alertPrice: 90000.0,
    },
    {
      symbol: 'ETH/USD',
      name: 'Ethereum',
      type: 'crypto',
      notes: 'Watch breakout above $3400',
      alertPrice: 3450.0,
    },
    {
      symbol: 'EUR/USD',
      name: 'Euro / US Dollar',
      type: 'forex',
      notes: 'ECB rate decision play',
      alertPrice: 1.0880,
    },
    {
      symbol: 'SOL/USD',
      name: 'Solana',
      type: 'crypto',
      notes: 'L1 Ecosystem momentum',
      alertPrice: 205.0,
    },
  ];

  for (const item of initialWatchlist) {
    await prisma.watchlist.upsert({
      where: {
        userId_symbol: {
          userId: user.id,
          symbol: item.symbol,
        },
      },
      update: {},
      create: {
        userId: user.id,
        symbol: item.symbol,
        name: item.name,
        type: item.type,
        notes: item.notes,
        alertPrice: item.alertPrice,
      },
    });
  }
  console.log('✓ Watchlists seeded (4 items)');

  // 3. Seed Initial Trade Journals
  const existingJournals = await prisma.tradeJournal.count({
    where: { userId: user.id },
  });

  if (existingJournals === 0) {
    await prisma.tradeJournal.create({
      data: {
        userId: user.id,
        symbol: 'BTC/USD',
        type: 'crypto',
        direction: 'LONG',
        entryPrice: 88100.0,
        exitPrice: 89650.0,
        stopLoss: 87200.0,
        takeProfit: 91500.0,
        positionSize: 25000.0,
        quantity: 0.2837,
        pnl: 439.88,
        pnlPercentage: 1.76,
        status: 'CLOSED',
        outcome: 'WIN',
        riskRewardRatio: 2.8,
        timeframe: '1h',
        aiSignalUsed: true,
        aiConfidence: 89,
        strategy: 'Wyckoff Spring + RSI Hidden Bullish Divergence',
        notes: 'Masuk setelah retest order block $88.100. AI merekomendasikan konfirmasi volume tinggi.',
        tags: ['AI-Signal', 'Wyckoff', 'Breakout'],
        closedAt: new Date(),
      },
    });

    await prisma.tradeJournal.create({
      data: {
        userId: user.id,
        symbol: 'EUR/USD',
        type: 'forex',
        direction: 'LONG',
        entryPrice: 1.0825,
        exitPrice: null,
        stopLoss: 1.0810,
        takeProfit: 1.0875,
        positionSize: 15000.0,
        quantity: 13856.8,
        pnl: 29.1,
        pnlPercentage: 0.19,
        status: 'OPEN',
        outcome: null,
        riskRewardRatio: 3.33,
        timeframe: '15m',
        aiSignalUsed: true,
        aiConfidence: 82,
        strategy: 'London Session Liquidity Sweep',
        notes: 'Posisi aktif berjalan menargetkan FVG atas di 1.0875.',
        tags: ['Forex', 'LondonOpen', 'SmartMoney'],
      },
    });
    console.log('✓ Trade Journals seeded (2 trades: 1 CLOSED WIN, 1 OPEN)');
  } else {
    console.log(`✓ Existing journals found (${existingJournals} trades)`);
  }

  console.log('--- SEEDING COMPLETED SUCCESSFULLY ---');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
