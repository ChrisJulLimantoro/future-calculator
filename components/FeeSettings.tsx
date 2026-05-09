'use client';

import { useEffect, useState } from 'react';
import { parseNumberInput } from '@/lib/parseNumberInput';
import type { FeeRates } from '@/lib/fees';

const FIELDS: { key: keyof FeeRates; label: string; hint: string }[] = [
  { key: 'limitEntryFeeRate',  label: 'Limit Entry Fee %',  hint: 'Maker fee charged when opening with a limit order.' },
  { key: 'marketEntryFeeRate', label: 'Market Entry Fee %', hint: 'Taker fee charged when opening with a market order.' },
  { key: 'limitExitFeeRate',   label: 'Limit Exit Fee %',   hint: 'Maker fee charged when closing with a limit order.' },
  { key: 'marketExitFeeRate',  label: 'Market Exit Fee %',  hint: 'Taker fee charged when closing with a market order.' },
];

type FormState = Record<keyof FeeRates, string>;

function ratesToForm(r: FeeRates): FormState {
  const out: Partial<FormState> = {};
  for (const { key } of FIELDS) {
    out[key] = (r[key] * 100).toString(); // store as percent for the user
  }
  return out as FormState;
}

export default function FeeSettings() {
  const [form, setForm] = useState<FormState | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'saving' | 'saved'>('loading');

  useEffect(() => {
    fetch('/api/settings', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? `HTTP ${r.status}`);
        return r.json() as Promise<FeeRates>;
      })
      .then((rates) => { setForm(ratesToForm(rates)); setStatus('idle'); })
      .catch((e) => { setError(e instanceof Error ? e.message : 'Failed to load'); setStatus('idle'); });
  }, []);

  if (status === 'loading' || !form) {
    return <div className="py-20 text-center text-zinc-600 text-sm">Loading…</div>;
  }

  const set = (key: keyof FeeRates) => (v: string) =>
    setForm((f) => (f ? { ...f, [key]: v } : f));

  const save = async () => {
    const payload: Partial<FeeRates> = {};
    for (const { key, label } of FIELDS) {
      const pct = parseNumberInput(form[key]);
      if (isNaN(pct) || pct < 0 || pct > 1) {
        setError(`${label} must be 0–1 (percent)`);
        return;
      }
      payload[key] = pct / 100;
    }
    setError(''); setStatus('saving');
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? `HTTP ${res.status}`);
      const fresh = (await res.json()) as FeeRates;
      setForm(ratesToForm(fresh));
      setStatus('saved');
      setTimeout(() => setStatus('idle'), 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
      setStatus('idle');
    }
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-800">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Trading Fees</h2>
        <p className="text-xs text-zinc-600 mt-1">
          Defaults applied to new positions. Enter as percent (e.g. <span className="font-mono">0.02</span> = 0.02%).
          Fee = position notional (size × leverage) × rate.
        </p>
      </div>
      <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
        {FIELDS.map(({ key, label, hint }) => (
          <div key={key} className="flex flex-col gap-1">
            <label className="text-xs text-zinc-500 uppercase tracking-wider">{label}</label>
            <input
              type="text"
              inputMode="decimal"
              value={form[key]}
              onChange={(e) => set(key)(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <span className="text-[11px] text-zinc-600">{hint}</span>
          </div>
        ))}
      </div>
      <div className="px-5 py-4 border-t border-zinc-800 flex items-center gap-3">
        <button
          onClick={save}
          disabled={status === 'saving'}
          className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
        >
          {status === 'saving' ? 'Saving…' : 'Save'}
        </button>
        {status === 'saved' && <span className="text-xs text-emerald-400">Saved</span>}
        {error && <span className="text-xs text-red-400">{error}</span>}
      </div>
    </div>
  );
}
