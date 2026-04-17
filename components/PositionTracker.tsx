'use client';

import { useCallback, useEffect, useState, Fragment } from 'react';
import { parseNumberInput } from '@/lib/parseNumberInput';
import { calcPnl } from '@/lib/positions';
import type { Position } from '@/lib/positions';
import { useBinancePrices } from '@/lib/binance';
import AuthForm from './AuthForm';

interface User { userId: string; username: string }

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

interface FormState {
  symbol: string; side: 'long' | 'short'; entryPrice: string; size: string; leverage: string;
}
const EMPTY_FORM: FormState = { symbol: '', side: 'long', entryPrice: '', size: '', leverage: '10' };

function Field({ label, value, onChange, placeholder, inputMode }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs text-zinc-500 uppercase tracking-wider">{label}</label>
      <input type="text" inputMode={inputMode} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm font-mono text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors" />
    </div>
  );
}

function AddForm({ onAdd }: { onAdd: (data: Omit<Position, 'id' | 'openedAt' | 'userId'>) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field: keyof FormState) => (val: string) => setForm((f) => ({ ...f, [field]: val }));

  const submit = async () => {
    const symbol = form.symbol.toUpperCase().trim();
    const entryPrice = parseNumberInput(form.entryPrice);
    const size = parseNumberInput(form.size);
    const leverage = parseNumberInput(form.leverage);
    if (!symbol) return setError('Symbol is required');
    if (isNaN(entryPrice) || entryPrice <= 0) return setError('Enter a valid entry price');
    if (isNaN(size) || size <= 0) return setError('Enter a valid size');
    if (isNaN(leverage) || leverage < 1) return setError('Enter a valid leverage');
    setLoading(true);
    try {
      await onAdd({ symbol, side: form.side, entryPrice, size, leverage });
      setForm(EMPTY_FORM); setError(''); setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to add position');
    } finally { setLoading(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-sm text-zinc-300 hover:text-zinc-100 hover:border-zinc-600 transition-colors">
      <span className="text-lg leading-none">+</span> New Position
    </button>
  );

  return (
    <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-zinc-300">New Position</span>
        <button onClick={() => { setOpen(false); setError(''); }} className="text-zinc-600 hover:text-zinc-400 text-lg leading-none">×</button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <Field label="Symbol" value={form.symbol} onChange={(v) => set('symbol')(v.toUpperCase())} placeholder="BTCUSDT" />
        <Field label="Entry Price" value={form.entryPrice} onChange={set('entryPrice')} placeholder="50000" inputMode="decimal" />
        <Field label="Size (USDT)" value={form.size} onChange={set('size')} placeholder="100" inputMode="decimal" />
        <Field label="Leverage" value={form.leverage} onChange={set('leverage')} placeholder="10" inputMode="decimal" />
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wider">Side</label>
          <div className="flex rounded-lg overflow-hidden border border-zinc-700">
            {(['long', 'short'] as const).map((s) => (
              <button key={s} onClick={() => set('side')(s)}
                className={`flex-1 py-2 text-sm font-medium transition-colors ${form.side === s ? (s === 'long' ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white') : 'bg-zinc-800 text-zinc-500 hover:text-zinc-300'}`}>
                {s === 'long' ? 'Long' : 'Short'}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-500 uppercase tracking-wider opacity-0">Add</label>
          <button onClick={submit} disabled={loading}
            className="py-2 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50">
            {loading ? 'Adding…' : 'Add Position'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}

function fmt(n: number, d = 2) {
  return n.toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
}

function PnlCell({ pnl, pnlPct }: { pnl: number; pnlPct: number }) {
  const color = pnl >= 0 ? 'text-emerald-400' : 'text-red-400';
  const sign = pnl >= 0 ? '+' : '';
  return (
    <div className={`font-mono text-sm ${color}`}>
      <div className="font-semibold">{sign}${fmt(pnl)}</div>
      <div className="text-xs opacity-75">{sign}{fmt(pnlPct)}%</div>
    </div>
  );
}

function CloseRow({ markPrice, onClose, onCancel }: {
  markPrice: number | undefined; onClose: (price: number) => void; onCancel: () => void;
}) {
  const [exitPrice, setExitPrice] = useState(markPrice ? String(markPrice) : '');
  return (
    <tr className="bg-zinc-800/60">
      <td colSpan={8} className="px-4 py-3">
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-xs text-zinc-400">Exit price:</span>
          <input type="text" inputMode="decimal" value={exitPrice} onChange={(e) => setExitPrice(e.target.value)}
            className="w-36 bg-zinc-700 border border-zinc-600 rounded-lg px-3 py-1.5 text-sm font-mono text-zinc-100 focus:outline-none focus:border-zinc-400" />
          <button onClick={() => { const p = parseNumberInput(exitPrice); if (!isNaN(p) && p > 0) onClose(p); }}
            className="px-4 py-1.5 rounded-lg bg-zinc-100 text-zinc-900 text-sm font-semibold hover:bg-white transition-colors">
            Confirm Close
          </button>
          <button onClick={onCancel} className="px-3 py-1.5 text-zinc-500 hover:text-zinc-300 text-sm transition-colors">Cancel</button>
        </div>
      </td>
    </tr>
  );
}

export default function PositionTracker() {
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [positions, setPositions] = useState<Position[]>([]);
  const [closingId, setClosingId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((r) => r.ok ? r.json() as Promise<User> : null)
      .then(setUser)
      .catch(() => setUser(null));
  }, []);

  const loadPositions = useCallback(async () => {
    try {
      const data = await apiFetch<Position[]>('/api/positions');
      setPositions(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { if (user) loadPositions(); }, [user, loadPositions]);

  const logout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
    setUser(null); setPositions([]);
  };

  const open = positions.filter((p) => !p.closedAt);
  const closed = positions
    .filter((p) => !!p.closedAt)
    .sort((a, b) => new Date(b.closedAt!).getTime() - new Date(a.closedAt!).getTime());
  const openSymbols = [...new Set(open.map((p) => p.symbol))];
  const { prices, stale } = useBinancePrices(openSymbols);

  if (user === undefined) return <div className="py-20 text-center text-zinc-600 text-sm">Loading…</div>;
  if (!user) return <AuthForm onSuccess={(username) => setUser({ userId: '', username })} />;

  const totalRealized = closed.reduce((s, p) => s + (p.realizedPnl ?? 0), 0);
  const wins = closed.filter((p) => (p.realizedPnl ?? 0) > 0).length;
  const winRate = closed.length > 0 ? (wins / closed.length) * 100 : 0;

  const addPosition = async (data: Omit<Position, 'id' | 'openedAt' | 'userId'>) => {
    await apiFetch('/api/positions', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
    });
    await loadPositions();
  };

  const handleClose = async (id: string, closePrice: number) => {
    await apiFetch(`/api/positions/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ closePrice }),
    });
    setClosingId(null); await loadPositions();
  };

  const handleDelete = async (id: string) => {
    await apiFetch(`/api/positions/${id}`, { method: 'DELETE' });
    await loadPositions();
  };

  const clearRealized = async () => {
    await Promise.all(closed.map((p) => apiFetch(`/api/positions/${p.id}`, { method: 'DELETE' })));
    setConfirmClear(false); await loadPositions();
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <AddForm onAdd={addPosition} />
        <div className="flex items-center gap-3">
          {stale && open.length > 0 && <span className="text-xs text-amber-500">⚠ Some prices unavailable</span>}
          <span className="text-xs text-zinc-600">Signed in as <span className="text-zinc-400 font-medium">{user.username}</span></span>
          <button onClick={logout} className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors">Sign out</button>
        </div>
      </div>

      {/* Open Positions */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Open Positions</h2>
          {open.length > 0 && <span className="text-xs text-zinc-600">{open.length} position{open.length > 1 ? 's' : ''} · refreshes every 3s</span>}
        </div>
        {open.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-600">No open positions</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Symbol', 'Side', 'Entry', 'Mark Price', 'Unreal. P&L', 'Leverage', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {open.map((pos) => {
                  const mark = prices.get(pos.symbol);
                  const { pnl, pnlPct } = mark
                    ? calcPnl(pos.side, pos.entryPrice, mark, pos.size, pos.leverage)
                    : { pnl: 0, pnlPct: 0 };
                  return (
                    <Fragment key={pos.id}>
                      <tr key={pos.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                        <td className="px-4 py-3 font-mono font-semibold text-zinc-100">{pos.symbol}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pos.side === 'long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                            {pos.side === 'long' ? 'Long' : 'Short'}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono text-zinc-300">{fmt(pos.entryPrice, 4)}</td>
                        <td className="px-4 py-3 font-mono text-zinc-100">
                          {mark ? <span className="flex items-center gap-1.5">{fmt(mark, 4)} <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /></span> : '—'}
                        </td>
                        <td className="px-4 py-3">{mark ? <PnlCell pnl={pnl} pnlPct={pnlPct} /> : <span className="text-zinc-600">—</span>}</td>
                        <td className="px-4 py-3 font-mono text-zinc-400">{pos.leverage}x</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setClosingId(closingId === pos.id ? null : pos.id)}
                              className="px-3 py-1 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-500 transition-colors">
                              Close
                            </button>
                            <button onClick={() => handleDelete(pos.id)} className="px-2 py-1 text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
                          </div>
                        </td>
                      </tr>
                      {closingId === pos.id && (
                        <CloseRow key={`close-${pos.id}`} markPrice={mark}
                          onClose={(price) => handleClose(pos.id, price)}
                          onCancel={() => setClosingId(null)} />
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Realized P&L */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between flex-wrap gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">Realized P&L</h2>
          {closed.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <span className={`font-mono font-bold text-base ${totalRealized >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                  {totalRealized >= 0 ? '+' : ''}${fmt(totalRealized)}
                </span>
                <span className="text-zinc-600">·</span>
                <span className="text-zinc-500 text-xs">{fmt(winRate, 0)}% WR · {closed.length} trade{closed.length > 1 ? 's' : ''}</span>
              </div>
              {!confirmClear ? (
                <button onClick={() => setConfirmClear(true)} className="text-xs text-zinc-700 hover:text-zinc-500 transition-colors">Clear all</button>
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-zinc-500">Sure?</span>
                  <button onClick={clearRealized} className="text-red-400 hover:text-red-300">Yes</button>
                  <button onClick={() => setConfirmClear(false)} className="text-zinc-600 hover:text-zinc-400">No</button>
                </div>
              )}
            </div>
          )}
        </div>
        {closed.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-zinc-600">No closed trades yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {['Symbol', 'Side', 'Entry', 'Close', 'Realized P&L', 'Leverage', 'Date', ''].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-zinc-600 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {closed.map((pos) => {
                  const pnl = pos.realizedPnl ?? 0;
                  const pnlPct = pos.size > 0 ? (pnl / pos.size) * 100 : 0;
                  const date = new Date(pos.closedAt!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
                  return (
                    <tr key={pos.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-zinc-100">{pos.symbol}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pos.side === 'long' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-red-500/15 text-red-400'}`}>
                          {pos.side === 'long' ? 'Long' : 'Short'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{fmt(pos.entryPrice, 4)}</td>
                      <td className="px-4 py-3 font-mono text-zinc-400">{pos.closePrice ? fmt(pos.closePrice, 4) : '—'}</td>
                      <td className="px-4 py-3"><PnlCell pnl={pnl} pnlPct={pnlPct} /></td>
                      <td className="px-4 py-3 font-mono text-zinc-500">{pos.leverage}x</td>
                      <td className="px-4 py-3 text-zinc-600 text-xs whitespace-nowrap">{date}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => handleDelete(pos.id)} className="text-zinc-700 hover:text-red-400 transition-colors text-xs">✕</button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
