import { NextRequest, NextResponse } from 'next/server';
import { getWatchlistItems, addWatchlistItem, removeWatchlistItem } from '../../../lib/db';

export async function GET() {
  try {
    const items = await getWatchlistItems();
    return NextResponse.json({
      success: true,
      data: items,
      total: items.length,
    });
  } catch (error: unknown) {
    console.error('Error fetching watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal mengambil data watchlist' },
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
    const name = (body.name as string) || symbol;
    const type = (body.type as string) || 'crypto';
    const notes = body.notes as string | undefined;
    const alertPrice = body.alertPrice as number | undefined;

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol wajib diisi' },
        { status: 400 }
      );
    }

    const item = await addWatchlistItem({
      symbol,
      name,
      type,
      notes,
      alertPrice,
    });

    return NextResponse.json({
      success: true,
      message: `Instrumen ${symbol} berhasil ditambahkan ke Watchlist`,
      data: item,
    });
  } catch (error: unknown) {
    console.error('Error adding to watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menambahkan instrumen ke watchlist' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let symbol = searchParams.get('symbol');

    if (!symbol) {
      try {
        const body = (await req.json()) as Record<string, unknown>;
        symbol = body.symbol as string;
      } catch {
        // no body
      }
    }

    if (!symbol) {
      return NextResponse.json(
        { success: false, error: 'Symbol wajib diisi' },
        { status: 400 }
      );
    }

    const success = await removeWatchlistItem(symbol);
    return NextResponse.json({
      success,
      message: `Instrumen ${symbol} berhasil dihapus dari Watchlist`,
    });
  } catch (error: unknown) {
    console.error('Error removing from watchlist:', error);
    return NextResponse.json(
      { success: false, error: 'Gagal menghapus instrumen dari watchlist' },
      { status: 500 }
    );
  }
}
