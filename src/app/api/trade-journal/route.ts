import { NextRequest, NextResponse } from 'next/server';
import { 
  getTradeJournals, 
  createTradeJournal, 
  closeTradeJournal, 
  deleteTradeJournal 
} from '../../../lib/db';

export async function GET() {
  try {
    const journals = await getTradeJournals();

    // Hitung statistik performa jurnal
    const closedTrades = journals.filter((j) => j.status === 'CLOSED');
    const winningTrades = closedTrades.filter((j) => j.outcome === 'WIN');
    const winRate = closedTrades.length > 0 
      ? parseFloat(((winningTrades.length / closedTrades.length) * 100).toFixed(1)) 
      : 0;

    const totalPnL = journals.reduce((acc, j) => acc + (j.pnl || 0), 0);
    const openTrades = journals.filter((j) => j.status === 'OPEN').length;
    const avgRR = journals.length > 0
      ? parseFloat(
          (
            journals.reduce((acc, j) => acc + (j.riskRewardRatio || 0), 0) /
            journals.length
          ).toFixed(2)
        )
      : 0;

    return NextResponse.json({
      success: true,
      data: journals,
      stats: {
        totalTrades: journals.length,
        closedTrades: closedTrades.length,
        openTrades,
        winRate,
        totalPnL: parseFloat(totalPnL.toFixed(2)),
        avgRiskRewardRatio: avgRR,
      },
    });
  } catch (error: unknown) {
    console.error('Error fetching trade journals:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data jurnal trading' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const symbol = body.symbol as string;
    const direction = (body.direction as 'LONG' | 'SHORT') || 'LONG';
    const entryPrice = Number(body.entryPrice);
    const stopLoss = Number(body.stopLoss);
    const takeProfit = Number(body.takeProfit);
    const positionSize = Number(body.positionSize) || 10000;

    if (!symbol || !entryPrice || !stopLoss || !takeProfit) {
      return NextResponse.json(
        { success: false, error: 'Parameter trading tidak lengkap (symbol, entry, stop loss, take profit)' },
        { status: 400 }
      );
    }

    const journal = await createTradeJournal({
      symbol,
      type: (body.type as string) || 'crypto',
      direction,
      entryPrice,
      stopLoss,
      takeProfit,
      positionSize,
      quantity: body.quantity ? Number(body.quantity) : undefined,
      timeframe: (body.timeframe as string) || '1h',
      aiSignalUsed: Boolean(body.aiSignalUsed),
      aiConfidence: body.aiConfidence ? Number(body.aiConfidence) : undefined,
      strategy: body.strategy as string | undefined,
      notes: body.notes as string | undefined,
      tags: body.tags as string[] | undefined,
    });

    return NextResponse.json({
      success: true,
      message: `Simulasi trade ${symbol} berhasil dicatat ke Jurnal!`,
      data: journal,
    });
  } catch (error: unknown) {
    console.error('Error creating trade journal:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mencatat trade ke jurnal' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    let body: Record<string, unknown> = {};
    try {
      body = (await req.json()) as Record<string, unknown>;
    } catch {
      body = {};
    }

    const id = body.id as string;
    const exitPrice = Number(body.exitPrice);
    const notes = body.notes as string | undefined;

    if (!id || !exitPrice) {
      return NextResponse.json(
        { success: false, error: 'ID dan exitPrice wajib disertakan' },
        { status: 400 }
      );
    }

    const updated = await closeTradeJournal(id, exitPrice, notes);
    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Jurnal trade tidak ditemukan' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Posisi trade berhasil ditutup dan dievaluasi di Jurnal!',
      data: updated,
    });
  } catch (error: unknown) {
    console.error('Error closing trade journal:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menutup posisi trade' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID jurnal trade wajib disertakan' },
        { status: 400 }
      );
    }

    const success = await deleteTradeJournal(id);
    return NextResponse.json({
      success,
      message: 'Entri jurnal trading berhasil dihapus',
    });
  } catch (error: unknown) {
    console.error('Error deleting trade journal:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus entri jurnal' },
      { status: 500 }
    );
  }
}
