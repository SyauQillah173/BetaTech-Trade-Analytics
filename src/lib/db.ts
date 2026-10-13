import { prisma, resolveDatabaseUrl } from './prisma';

export interface WatchlistRecord {
  id: string;
  userId: string;
  symbol: string;
  name: string;
  type: string;
  notes?: string | null;
  alertPrice?: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeJournalRecord {
  id: string;
  userId: string;
  symbol: string;
  type: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  exitPrice?: number | null;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  quantity?: number | null;
  pnl?: number | null;
  pnlPercentage?: number | null;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  outcome?: 'WIN' | 'LOSS' | 'BREAKEVEN' | null;
  riskRewardRatio?: number | null;
  timeframe?: string | null;
  aiSignalUsed: boolean;
  aiConfidence?: number | null;
  strategy?: string | null;
  notes?: string | null;
  tags: string[];
  closedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// In-Memory fallback store for environments without configured Supabase credentials
const fallbackUser = {
  id: 'usr-default-01',
  email: 'trader@betatech.analytics',
  name: 'BetaTech Pro Trader',
  balance: 100000.0,
};

let fallbackWatchlists: WatchlistRecord[] = [
  {
    id: 'wl-1',
    userId: fallbackUser.id,
    symbol: 'BTC/USD',
    name: 'Bitcoin',
    type: 'crypto',
    notes: 'Core holding, support $88k',
    alertPrice: 90000,
    createdAt: new Date('2026-10-10T10:00:00Z'),
    updatedAt: new Date('2026-10-10T10:00:00Z'),
  },
  {
    id: 'wl-2',
    userId: fallbackUser.id,
    symbol: 'ETH/USD',
    name: 'Ethereum',
    type: 'crypto',
    notes: 'Watch breakout above $3400',
    alertPrice: 3450,
    createdAt: new Date('2026-10-11T12:00:00Z'),
    updatedAt: new Date('2026-10-11T12:00:00Z'),
  },
  {
    id: 'wl-3',
    userId: fallbackUser.id,
    symbol: 'EUR/USD',
    name: 'Euro / US Dollar',
    type: 'forex',
    notes: 'ECB rate decision play',
    alertPrice: 1.0880,
    createdAt: new Date('2026-10-12T08:00:00Z'),
    updatedAt: new Date('2026-10-12T08:00:00Z'),
  },
];

let fallbackJournals: TradeJournalRecord[] = [
  {
    id: 'tj-01',
    userId: fallbackUser.id,
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
    closedAt: new Date('2026-10-12T16:45:00Z'),
    createdAt: new Date('2026-10-12T10:15:00Z'),
    updatedAt: new Date('2026-10-12T16:45:00Z'),
  },
  {
    id: 'tj-02',
    userId: fallbackUser.id,
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
    closedAt: null,
    createdAt: new Date('2026-10-13T01:30:00Z'),
    updatedAt: new Date('2026-10-13T01:30:00Z'),
  },
];

function isPrismaConnected(): boolean {
  const url = resolveDatabaseUrl();
  if (!url) return false;
  return !url.includes('your-project-ref') && !url.includes('your-password');
}

// -------------------------------------------------------------
// USER OPERATIONS
// -------------------------------------------------------------
export async function getOrCreateDefaultUser() {
  if (isPrismaConnected()) {
    try {
      let user = await prisma.user.findUnique({
        where: { email: fallbackUser.email },
      });
      if (!user) {
        user = await prisma.user.create({
          data: {
            email: fallbackUser.email,
            name: fallbackUser.name,
            balance: fallbackUser.balance,
          },
        });
      }
      return user;
    } catch (e) {
      console.warn('Prisma getOrCreateDefaultUser fallback:', e);
    }
  }
  return fallbackUser;
}

// -------------------------------------------------------------
// WATCHLIST OPERATIONS (Tambah / Hapus / Ambil)
// -------------------------------------------------------------
export async function getWatchlistItems(userId?: string): Promise<WatchlistRecord[]> {
  const defaultUser = await getOrCreateDefaultUser();
  const uid = userId || defaultUser.id;
  if (isPrismaConnected()) {
    try {
      const items = await prisma.watchlist.findMany({
        where: { userId: uid },
        orderBy: { createdAt: 'desc' },
      });
      return items;
    } catch (e) {
      console.warn('Prisma getWatchlistItems fallback:', e);
    }
  }
  return fallbackWatchlists.filter((w) => w.userId === uid);
}

export async function addWatchlistItem(data: {
  userId?: string;
  symbol: string;
  name: string;
  type: string;
  notes?: string;
  alertPrice?: number;
}): Promise<WatchlistRecord> {
  const defaultUser = await getOrCreateDefaultUser();
  const uid = data.userId || defaultUser.id;
  if (isPrismaConnected()) {
    try {
      const existing = await prisma.watchlist.findUnique({
        where: {
          userId_symbol: {
            userId: uid,
            symbol: data.symbol,
          },
        },
      });

      if (existing) {
        return existing;
      }

      return await prisma.watchlist.create({
        data: {
          userId: uid,
          symbol: data.symbol,
          name: data.name,
          type: data.type,
          notes: data.notes,
          alertPrice: data.alertPrice,
        },
      });
    } catch (e) {
      console.warn('Prisma addWatchlistItem fallback:', e);
    }
  }

  // Fallback memory implementation
  const found = fallbackWatchlists.find((w) => w.userId === uid && w.symbol === data.symbol);
  if (found) return found;

  const newItem: WatchlistRecord = {
    id: `wl-${Date.now()}`,
    userId: uid,
    symbol: data.symbol,
    name: data.name,
    type: data.type,
    notes: data.notes || null,
    alertPrice: data.alertPrice || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  fallbackWatchlists.unshift(newItem);
  return newItem;
}

export async function removeWatchlistItem(symbol: string, userId?: string): Promise<boolean> {
  const defaultUser = await getOrCreateDefaultUser();
  const uid = userId || defaultUser.id;
  if (isPrismaConnected()) {
    try {
      await prisma.watchlist.deleteMany({
        where: {
          userId: uid,
          symbol,
        },
      });
      return true;
    } catch (e) {
      console.warn('Prisma removeWatchlistItem fallback:', e);
    }
  }

  const initialLen = fallbackWatchlists.length;
  fallbackWatchlists = fallbackWatchlists.filter(
    (w) => !(w.userId === uid && w.symbol === symbol)
  );
  return fallbackWatchlists.length < initialLen;
}

// -------------------------------------------------------------
// TRADE JOURNAL OPERATIONS (Catat / Ambil / Update / Hapus)
// -------------------------------------------------------------
export async function getTradeJournals(userId?: string): Promise<TradeJournalRecord[]> {
  const defaultUser = await getOrCreateDefaultUser();
  const uid = userId || defaultUser.id;
  if (isPrismaConnected()) {
    try {
      const items = await prisma.tradeJournal.findMany({
        where: { userId: uid },
        orderBy: { createdAt: 'desc' },
      });
      return items as TradeJournalRecord[];
    } catch (e) {
      console.warn('Prisma getTradeJournals fallback:', e);
    }
  }
  return [...fallbackJournals].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export async function createTradeJournal(data: {
  userId?: string;
  symbol: string;
  type?: string;
  direction: 'LONG' | 'SHORT';
  entryPrice: number;
  stopLoss: number;
  takeProfit: number;
  positionSize: number;
  quantity?: number;
  timeframe?: string;
  aiSignalUsed?: boolean;
  aiConfidence?: number;
  strategy?: string;
  notes?: string;
  tags?: string[];
}): Promise<TradeJournalRecord> {
  const defaultUser = await getOrCreateDefaultUser();
  const uid = data.userId || defaultUser.id;
  const slDist = Math.abs(data.entryPrice - data.stopLoss);
  const tpDist = Math.abs(data.takeProfit - data.entryPrice);
  const rr = slDist > 0 ? parseFloat((tpDist / slDist).toFixed(2)) : 2.0;

  if (isPrismaConnected()) {
    try {
      const item = await prisma.tradeJournal.create({
        data: {
          userId: uid,
          symbol: data.symbol,
          type: data.type || 'crypto',
          direction: data.direction,
          entryPrice: data.entryPrice,
          stopLoss: data.stopLoss,
          takeProfit: data.takeProfit,
          positionSize: data.positionSize,
          quantity: data.quantity || (data.positionSize / data.entryPrice),
          riskRewardRatio: rr,
          timeframe: data.timeframe || '1h',
          aiSignalUsed: data.aiSignalUsed ?? false,
          aiConfidence: data.aiConfidence || null,
          strategy: data.strategy || 'Simulasi Eksekusi Terminal',
          notes: data.notes || '',
          tags: data.tags || ['Simulasi'],
          status: 'OPEN',
        },
      });
      return item as TradeJournalRecord;
    } catch (e) {
      console.warn('Prisma createTradeJournal fallback:', e);
    }
  }

  const newJournal: TradeJournalRecord = {
    id: `tj-${Date.now()}`,
    userId: uid,
    symbol: data.symbol,
    type: data.type || 'crypto',
    direction: data.direction,
    entryPrice: data.entryPrice,
    exitPrice: null,
    stopLoss: data.stopLoss,
    takeProfit: data.takeProfit,
    positionSize: data.positionSize,
    quantity: data.quantity || parseFloat((data.positionSize / data.entryPrice).toFixed(4)),
    pnl: 0,
    pnlPercentage: 0,
    status: 'OPEN',
    outcome: null,
    riskRewardRatio: rr,
    timeframe: data.timeframe || '1h',
    aiSignalUsed: data.aiSignalUsed ?? false,
    aiConfidence: data.aiConfidence || null,
    strategy: data.strategy || 'Simulasi Eksekusi Terminal',
    notes: data.notes || 'Dicatat otomatis dari Terminal BetaTech Analytics.',
    tags: data.tags || ['Simulasi', 'Terminal'],
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  fallbackJournals.unshift(newJournal);
  return newJournal;
}

export async function closeTradeJournal(
  id: string,
  exitPrice: number,
  notes?: string
): Promise<TradeJournalRecord | null> {
  const current = fallbackJournals.find((j) => j.id === id);
  if (!current) return null;

  const isLong = current.direction === 'LONG';
  const priceDiff = isLong ? exitPrice - current.entryPrice : current.entryPrice - exitPrice;
  const pnlPct = (priceDiff / current.entryPrice) * 100;
  const pnl = (current.positionSize * pnlPct) / 100;
  const outcome: 'WIN' | 'LOSS' | 'BREAKEVEN' =
    pnl > 0.5 ? 'WIN' : pnl < -0.5 ? 'LOSS' : 'BREAKEVEN';

  if (isPrismaConnected()) {
    try {
      const updated = await prisma.tradeJournal.update({
        where: { id },
        data: {
          exitPrice,
          pnl: parseFloat(pnl.toFixed(2)),
          pnlPercentage: parseFloat(pnlPct.toFixed(2)),
          status: 'CLOSED',
          outcome,
          notes: notes ? `${current.notes || ''} [Tutup: ${notes}]` : current.notes,
          closedAt: new Date(),
        },
      });
      return updated as TradeJournalRecord;
    } catch (e) {
      console.warn('Prisma closeTradeJournal fallback:', e);
    }
  }

  current.exitPrice = exitPrice;
  current.pnl = parseFloat(pnl.toFixed(2));
  current.pnlPercentage = parseFloat(pnlPct.toFixed(2));
  current.status = 'CLOSED';
  current.outcome = outcome;
  current.closedAt = new Date();
  if (notes) current.notes = `${current.notes || ''} [Tutup: ${notes}]`;
  current.updatedAt = new Date();

  return current;
}

export async function deleteTradeJournal(id: string): Promise<boolean> {
  if (isPrismaConnected()) {
    try {
      await prisma.tradeJournal.delete({
        where: { id },
      });
      return true;
    } catch (e) {
      console.warn('Prisma deleteTradeJournal fallback:', e);
    }
  }

  const prevLen = fallbackJournals.length;
  fallbackJournals = fallbackJournals.filter((j) => j.id !== id);
  return fallbackJournals.length < prevLen;
}
