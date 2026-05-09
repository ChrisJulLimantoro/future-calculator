'use client';

import { useState } from 'react';
import RiskCalculator from '@/components/RiskCalculator';
import PositionTracker from '@/components/PositionTracker';
import FeeSettings from '@/components/FeeSettings';

type Tab = 'calculator' | 'positions' | 'settings';

export default function Home() {
  const [tab, setTab] = useState<Tab>('calculator');

  return (
    <main className="min-h-screen bg-zinc-950 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight">Trading Risk Calculator</h1>
          <p className="text-sm text-zinc-500 mt-1">Real risk, not theoretical — prevent over-leveraging before it happens</p>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-1 bg-zinc-900 border border-zinc-800 rounded-xl w-fit">
          {([['calculator', 'Calculator'], ['positions', 'Positions'], ['settings', 'Settings']] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                tab === id
                  ? 'bg-zinc-700 text-zinc-100'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'calculator' && <RiskCalculator />}
        {tab === 'positions' && <PositionTracker />}
        {tab === 'settings' && <FeeSettings />}
      </div>
    </main>
  );
}
