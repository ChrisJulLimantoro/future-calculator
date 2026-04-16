import { useEffect, useRef, useState } from 'react';

const BASE = 'https://fapi.binance.com/fapi/v1/ticker/price';

async function fetchPrice(symbol: string): Promise<number | null> {
  try {
    const res = await fetch(`${BASE}?symbol=${symbol}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const data = (await res.json()) as { price: string };
    return parseFloat(data.price);
  } catch {
    return null;
  }
}

// Polls Binance futures mark prices for the given symbols every `intervalMs`.
// Returns a map of symbol → price and a boolean indicating if data is fresh.
export function useBinancePrices(
  symbols: string[],
  intervalMs = 3000
): { prices: Map<string, number>; stale: boolean } {
  const [prices, setPrices] = useState<Map<string, number>>(new Map());
  const [stale, setStale] = useState(false);
  const lastFetchRef = useRef<number>(0);

  useEffect(() => {
    if (!symbols.length) return;
    if (symbols.length === 0) return;

    let active = true;

    const fetch = async () => {
      const results = await Promise.all(
        symbols.map(async (sym) => ({ sym, price: await fetchPrice(sym) }))
      );

      if (!active) return;

      const now = Date.now();
      lastFetchRef.current = now;

      setPrices((prev) => {
        const next = new Map(prev);
        for (const { sym, price } of results) {
          if (price !== null) next.set(sym, price);
        }
        return next;
      });

      // Stale if any symbol returned null (failed fetch)
      setStale(results.some((r) => r.price === null));
    };

    fetch();
    const id = setInterval(fetch, intervalMs);
    return () => {
      active = false;
      clearInterval(id);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbols.join(','), intervalMs]);

  return { prices, stale };
}
