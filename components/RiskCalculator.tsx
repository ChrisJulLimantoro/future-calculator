'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { TradeInputs, computeTradeResults } from '@/lib/calculator';
import { parseNumberInput } from '@/lib/parseNumberInput';

const DEFAULT_INPUTS: TradeInputs = {
  entryPrice: 0,
  stopLoss: 0,
  leverage: 10,
  riskPct: 1,
  accountSize: 0,
};

function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  suffix,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  placeholder?: string;
  suffix?: string;
}) {
  const [display, setDisplay] = useState(() => value === 0 ? '' : String(value));
  const focused = useRef(false);

  // Only sync from parent when the field isn't being typed into
  useEffect(() => {
    if (!focused.current) {
      setDisplay(value === 0 ? '' : String(value));
    }
  }, [value]);

  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
      <div className="relative">
        <input
          type="text"
          inputMode="decimal"
          value={display}
          onFocus={() => { focused.current = true; }}
          onBlur={() => {
            focused.current = false;
            // Normalise on blur so display matches the stored number
            setDisplay(value === 0 ? '' : String(value));
          }}
          onChange={(e) => {
            const raw = e.target.value;
            setDisplay(raw);
            const num = parseNumberInput(raw);
            if (!isNaN(num)) onChange(num);
            else if (raw === '') onChange(0);
          }}
          placeholder={placeholder ?? '0'}
          className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-xl px-4 py-3 text-base text-zinc-100 font-mono placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500/50 transition-colors"
        />
        {suffix && (
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-zinc-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}

// Ticks shown as labeled marks under each slider
const LEVERAGE_TICKS = [5, 25, 50, 75, 100, 125, 150];
const RISK_TICKS = [1, 25, 50, 75, 100];

function Slider({
  label,
  value,
  min,
  max,
  step,
  ticks,
  onChange,
  format,
  colorFn,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  ticks: number[];
  onChange: (v: number) => void;
  format: (v: number) => string;
  colorFn?: (v: number) => string;
}) {
  const fillPct = ((value - min) / (max - min)) * 100;
  const color = colorFn?.(value) ?? 'text-zinc-100';

  return (
    <div className="flex flex-col gap-2">
      {/* Label + live value */}
      <div className="flex justify-between items-center">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
        <span className={`text-sm font-mono font-semibold ${color}`}>{format(value)}</span>
      </div>

      {/* Track + thumb */}
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{
          background: `linear-gradient(to right, #71717a ${fillPct}%, #27272a ${fillPct}%)`,
        }}
        className="slider w-full h-1.5 rounded-full appearance-none cursor-pointer outline-none"
      />

      {/* Tick marks with labels */}
      <div className="relative h-5">
        {ticks.map((t) => {
          const pct = ((t - min) / (max - min)) * 100;
          return (
            <div
              key={t}
              className="absolute flex flex-col items-center gap-0.5"
              style={{ left: `${pct}%`, transform: 'translateX(-50%)' }}
            >
              <div className="w-px h-1.5 bg-zinc-700" />
              <span className="text-[10px] leading-none text-zinc-600">{format(t)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function RiskCalculator() {
  const [inputs, setInputs] = useState<TradeInputs>(DEFAULT_INPUTS);
  const results = useMemo(() => computeTradeResults(inputs), [inputs]);

  const set = (field: keyof TradeInputs) => (v: number) =>
    setInputs((prev) => ({ ...prev, [field]: v }));

  const riskColor = (v: number) =>
    v > 5 ? 'text-red-400' : v > 2 ? 'text-amber-400' : 'text-emerald-400';

  const leverageColor = (v: number) =>
    v >= 75 ? 'text-red-400' : v >= 25 ? 'text-amber-400' : 'text-zinc-100';

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-6 items-start">
      {/* ── Inputs ── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col gap-6">
        <NumberInput
          label="Account Size"
          value={inputs.accountSize}
          onChange={set('accountSize')}
          placeholder="10000"
          suffix="$"
        />
        <div className="border-t border-zinc-800" />
        <NumberInput
          label="Entry Price"
          value={inputs.entryPrice}
          onChange={set('entryPrice')}
          placeholder="50000"
        />
        <div className="flex flex-col gap-1.5">
          <NumberInput
            label="Stop Loss"
            value={inputs.stopLoss}
            onChange={set('stopLoss')}
            placeholder="48000 or 52000"
          />
          <p className="text-[11px] leading-snug text-zinc-500">
            Below entry → long; above entry → short. Direction is inferred from entry and stop.
          </p>
          {inputs.entryPrice > 0 && inputs.stopLoss > 0 && inputs.stopLoss !== inputs.entryPrice && (
            <p className="text-xs font-medium text-zinc-400">
              {inputs.stopLoss < inputs.entryPrice ? (
                <span className="text-emerald-400/90">Long setup</span>
              ) : (
                <span className="text-red-400/90">Short setup</span>
              )}
              <span className="text-zinc-500 font-normal"> — stop is {inputs.stopLoss < inputs.entryPrice ? 'below' : 'above'} entry</span>
            </p>
          )}
        </div>
        <div className="border-t border-zinc-800" />
        <Slider
          label="Leverage"
          value={inputs.leverage}
          min={5}
          max={150}
          step={5}
          ticks={LEVERAGE_TICKS}
          onChange={set('leverage')}
          format={(v) => `${v}x`}
          colorFn={leverageColor}
        />
        <Slider
          label="Risk"
          value={inputs.riskPct}
          min={1}
          max={100}
          step={1}
          ticks={RISK_TICKS}
          onChange={set('riskPct')}
          format={(v) => `${v}%`}
          colorFn={riskColor}
        />
      </div>

      {/* ── Outputs ── */}
      <div className="flex flex-col gap-4">
        {!results.valid ? (
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-600 text-sm">
            Enter entry price and stop loss to calculate
          </div>
        ) : (
          <>
            {/* Position sizing */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-5">Position Sizing</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Stat
                  label="Capital to use"
                  value={`${results.positionSizePct.toFixed(2)}%`}
                  sub={inputs.accountSize > 0 ? `$${(inputs.accountSize * results.positionSizePct / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}` : undefined}
                  highlight
                />
                <Stat
                  label="Max loss"
                  value={`${inputs.riskPct}%`}
                  sub={results.lossDollar > 0 ? `−$${results.lossDollar.toLocaleString('en-US', { maximumFractionDigits: 2 })}` : undefined}
                  valueColor="text-red-400"
                />
                <Stat
                  label="Direction"
                  value={results.isLong ? 'Long' : 'Short'}
                  valueColor={results.isLong ? 'text-emerald-400' : 'text-red-400'}
                />
                <Stat
                  label="Liquidation"
                  value={`$${results.liquidationPrice.toLocaleString('en-US', { maximumFractionDigits: 4 })}`}
                  sub={`${results.liquidationDistancePct.toFixed(2)}% away`}
                  valueColor={results.liquidationDistancePct < 5 ? 'text-red-400' : results.liquidationDistancePct < 10 ? 'text-amber-400' : 'text-zinc-100'}
                />
              </div>
            </div>

            {/* RR Table */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
              <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-5">Risk / Reward</p>
              <div className="grid grid-cols-3 gap-3">
                {results.rrLevels.map(({ ratio, tp, profitPct, profitDollar }) => (
                  <div
                    key={ratio}
                    className="bg-zinc-800/60 border border-zinc-700/60 rounded-xl p-4 flex flex-col gap-2"
                  >
                    <div className="text-xs text-zinc-500 font-medium">1 : {ratio}</div>
                    <div className="text-lg font-mono font-bold text-emerald-400">
                      +{profitPct.toFixed(1)}%
                    </div>
                    {profitDollar > 0 && (
                      <div className="text-sm font-mono font-semibold text-emerald-500">
                        +${profitDollar.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </div>
                    )}
                    <div className="text-xs font-mono text-zinc-400 mt-1">
                      TP {tp.toFixed(4)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  highlight,
  valueColor,
}: {
  label: string;
  value: string;
  sub?: string;
  highlight?: boolean;
  valueColor?: string;
}) {
  return (
    <div className={`rounded-xl p-4 flex flex-col gap-1 ${highlight ? 'bg-zinc-700/50 border border-zinc-600/50' : 'bg-zinc-800/40'}`}>
      <div className="text-xs text-zinc-500">{label}</div>
      <div className={`text-xl font-mono font-bold ${valueColor ?? 'text-zinc-100'}`}>{value}</div>
      {sub && <div className="text-xs text-zinc-600 font-mono">{sub}</div>}
    </div>
  );
}
