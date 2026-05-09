// Position shape — mirrors the database row from lib/db/schema.ts
export interface Position {
  id: string;
  userId?: string;
  symbol: string;
  side: 'long' | 'short';
  entryPrice: number;
  size: number;      // margin in USDT (capital allocated, before leverage)
  leverage: number;
  entryOrderType?: 'limit' | 'market' | null;
  entryFeeRate?: number | null;
  entryFee?: number | null;
  openedAt: string | Date;
  closedAt?: string | Date | null;
  closePrice?: number | null;
  exitOrderType?: 'limit' | 'market' | null;
  exitFeeRate?: number | null;
  exitFee?: number | null;
  totalFees?: number | null;
  realizedPnl?: number | null;
}

export function calcPnl(
  side: 'long' | 'short',
  entryPrice: number,
  markPrice: number,
  size: number,
  leverage: number
): { pnl: number; pnlPct: number } {
  const direction = side === 'long' ? 1 : -1;
  const pnl = direction * ((markPrice - entryPrice) / entryPrice) * size * leverage;
  const pnlPct = (pnl / size) * 100;
  return { pnl, pnlPct };
}
