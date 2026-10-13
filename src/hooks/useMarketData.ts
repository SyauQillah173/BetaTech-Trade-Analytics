'use client';

import useSWR from 'swr';
import { Instrument, Timeframe } from '../types/market';
import {
  fetchLiveCryptoTickers,
  fetchKlines,
  fetchOrderBook,
  fetchRecentTrades,
  ChartCandle,
  LiveTicker,
} from '../services/marketApi';

/**
 * Hook to auto-refresh live 24h crypto ticker prices every few seconds using SWR
 */
export function useCryptoTickers(refreshInterval: number = 3000) {
  const { data, error, isValidating, mutate } = useSWR<Record<string, LiveTicker>>(
    'crypto-tickers',
    fetchLiveCryptoTickers,
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 1500,
    }
  );

  return {
    tickers: data || {},
    isLoading: !data && !error,
    isError: !!error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Hook to auto-refresh candlestick data for the selected instrument & timeframe
 */
export function useInstrumentKlines(
  instrument: Instrument,
  timeframe: Timeframe,
  refreshInterval: number = 4000
) {
  const key = instrument ? `klines-${instrument.id}-${timeframe}` : null;

  const { data, error, isValidating, mutate } = useSWR<ChartCandle[]>(
    key,
    () => fetchKlines(instrument, timeframe, 100),
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 2000,
    }
  );

  return {
    candles: data || [],
    isLoading: !data && !error,
    isError: !!error,
    isValidating,
    refresh: mutate,
  };
}

/**
 * Hook to auto-refresh Orderbook depth and recent live trades
 */
export function useInstrumentDepthAndTrades(
  instrument: Instrument,
  refreshInterval: number = 3000
) {
  const key = instrument ? `depth-trades-${instrument.id}` : null;

  const { data, error, isValidating } = useSWR(
    key,
    async () => {
      const [orderBook, trades] = await Promise.all([
        fetchOrderBook(instrument),
        fetchRecentTrades(instrument),
      ]);
      return { orderBook, trades };
    },
    {
      refreshInterval,
      revalidateOnFocus: true,
      dedupingInterval: 1500,
    }
  );

  return {
    orderBook: data?.orderBook ?? { bids: [], asks: [] },
    trades: data?.trades ?? [],
    isLoading: !data && !error,
    isError: !!error,
    isValidating,
  };
}
