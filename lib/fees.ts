export type OrderType = 'limit' | 'market';

export interface FeeRates {
  limitEntryFeeRate: number;
  marketEntryFeeRate: number;
  limitExitFeeRate: number;
  marketExitFeeRate: number;
}

export const DEFAULT_FEE_RATES: FeeRates = {
  limitEntryFeeRate: 0.0002,  // 0.02%
  marketEntryFeeRate: 0.0005, // 0.05%
  limitExitFeeRate: 0.0002,
  marketExitFeeRate: 0.0005,
};

export const MAX_FEE_RATE = 0.01; // 1% sanity cap

export function entryRateFor(rates: FeeRates, type: OrderType): number {
  return type === 'limit' ? rates.limitEntryFeeRate : rates.marketEntryFeeRate;
}

export function exitRateFor(rates: FeeRates, type: OrderType): number {
  return type === 'limit' ? rates.limitExitFeeRate : rates.marketExitFeeRate;
}

export function computeEntryFee(size: number, leverage: number, rate: number): number {
  return size * leverage * rate;
}

export function computeExitFee(
  size: number,
  leverage: number,
  entryPrice: number,
  closePrice: number,
  rate: number
): number {
  return size * leverage * (closePrice / entryPrice) * rate;
}

export function computeRealizedPnl(args: {
  side: 'long' | 'short';
  entryPrice: number;
  closePrice: number;
  size: number;
  leverage: number;
  entryFee: number;
  exitFee: number;
}): number {
  const dir = args.side === 'long' ? 1 : -1;
  const gross =
    dir * ((args.closePrice - args.entryPrice) / args.entryPrice) * args.size * args.leverage;
  return gross - args.entryFee - args.exitFee;
}

export function isValidRate(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n >= 0 && n <= MAX_FEE_RATE;
}

export function isOrderType(v: unknown): v is OrderType {
  return v === 'limit' || v === 'market';
}
