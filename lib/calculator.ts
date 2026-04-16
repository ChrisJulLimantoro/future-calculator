export interface TradeInputs {
  entryPrice: number;
  stopLoss: number;
  leverage: number;
  riskPct: number;
  accountSize: number;
}

export interface RRLevel {
  ratio: number;
  tp: number;
  profitPct: number;
  profitDollar: number;
}

export interface TradeResults {
  valid: boolean;
  isLong: boolean;
  slDistancePct: number;
  positionSizePct: number;
  liquidationPrice: number;
  liquidationDistancePct: number;
  lossDollar: number;
  rrLevels: RRLevel[];
}

export function computeTradeResults(inputs: TradeInputs): TradeResults {
  const { entryPrice, stopLoss, leverage, riskPct, accountSize } = inputs;

  const invalid: TradeResults = {
    valid: false,
    isLong: true,
    slDistancePct: 0,
    positionSizePct: 0,
    liquidationPrice: 0,
    liquidationDistancePct: 0,
    lossDollar: 0,
    rrLevels: [],
  };

  if (entryPrice <= 0 || stopLoss <= 0 || leverage <= 0 || stopLoss === entryPrice) return invalid;

  const isLong = stopLoss < entryPrice;
  const slRatio = Math.abs(entryPrice - stopLoss) / entryPrice;
  const slDistancePct = slRatio * 100;

  // Position% = Risk% / ((abs(Entry - SL) / Entry) × Leverage)
  const positionSizePct = riskPct / (slRatio * leverage);

  const liquidationPrice = isLong
    ? entryPrice * (1 - 1 / leverage)
    : entryPrice * (1 + 1 / leverage);

  const liquidationDistancePct = (Math.abs(entryPrice - liquidationPrice) / entryPrice) * 100;

  // Dollar P&L — only meaningful when accountSize > 0
  const lossDollar = accountSize > 0 ? accountSize * (riskPct / 100) : 0;

  const slDist = Math.abs(entryPrice - stopLoss);
  const rrLevels: RRLevel[] = [1, 2, 3].map((ratio) => ({
    ratio,
    tp: isLong ? entryPrice + ratio * slDist : entryPrice - ratio * slDist,
    profitPct: ratio * riskPct,
    profitDollar: accountSize > 0 ? accountSize * (ratio * riskPct / 100) : 0,
  }));

  return {
    valid: true,
    isLong,
    slDistancePct,
    positionSizePct,
    liquidationPrice,
    liquidationDistancePct,
    lossDollar,
    rrLevels,
  };
}
