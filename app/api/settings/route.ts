import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import { DEFAULT_FEE_RATES, isValidRate, type FeeRates } from '@/lib/fees';

async function loadOrCreate(userId: string): Promise<FeeRates> {
  // Upsert to avoid a race between concurrent first-time GETs from the same user.
  const [row] = await db
    .insert(schema.userSettings)
    .values({ userId, ...DEFAULT_FEE_RATES })
    .onConflictDoNothing()
    .returning();

  if (row) return { ...DEFAULT_FEE_RATES };

  // Row already existed — fetch it.
  const [existing] = await db
    .select()
    .from(schema.userSettings)
    .where(eq(schema.userSettings.userId, userId))
    .limit(1);

  return {
    limitEntryFeeRate: existing.limitEntryFeeRate,
    marketEntryFeeRate: existing.marketEntryFeeRate,
    limitExitFeeRate: existing.limitExitFeeRate,
    marketExitFeeRate: existing.marketExitFeeRate,
  };
}

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const rates = await loadOrCreate(session.userId);
    return Response.json(rates);
  } catch (err) {
    console.error('[settings GET]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = (await req.json()) as Partial<FeeRates>;
    const fields: (keyof FeeRates)[] = [
      'limitEntryFeeRate',
      'marketEntryFeeRate',
      'limitExitFeeRate',
      'marketExitFeeRate',
    ];
    const update: Partial<FeeRates> = {};
    for (const f of fields) {
      if (body[f] !== undefined) {
        if (!isValidRate(body[f])) {
          return Response.json({ error: `Invalid ${f} (must be 0–0.01)` }, { status: 400 });
        }
        update[f] = body[f];
      }
    }

    // Ensure row exists
    const current = await loadOrCreate(session.userId);
    const merged = { ...current, ...update };

    await db
      .update(schema.userSettings)
      .set({ ...update, updatedAt: new Date() })
      .where(eq(schema.userSettings.userId, session.userId));

    return Response.json(merged);
  } catch (err) {
    console.error('[settings PUT]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
