import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import {
  DEFAULT_FEE_RATES,
  computeEntryFee,
  entryRateFor,
  isOrderType,
  isValidRate,
  type OrderType,
} from '@/lib/fees';

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const rows = await db
    .select()
    .from(schema.positions)
    .where(eq(schema.positions.userId, session.userId))
    .orderBy(schema.positions.openedAt);

  return Response.json(rows);
}

export async function POST(req: Request) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json() as {
      symbol: string;
      side: string;
      entryPrice: number;
      size: number;
      leverage: number;
      entryOrderType?: string;
      entryFeeRate?: number; // optional override
    };

    if (!body.symbol || !body.side || !body.entryPrice || !body.size || !body.leverage) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const orderType: OrderType = isOrderType(body.entryOrderType) ? body.entryOrderType : 'limit';

    let entryFeeRate: number;
    if (body.entryFeeRate !== undefined) {
      if (!isValidRate(body.entryFeeRate)) {
        return Response.json({ error: 'Invalid entryFeeRate (must be 0–0.01)' }, { status: 400 });
      }
      entryFeeRate = body.entryFeeRate;
    } else {
      const [settings] = await db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, session.userId))
        .limit(1);
      const rates = settings ?? DEFAULT_FEE_RATES;
      entryFeeRate = entryRateFor(rates, orderType);
    }

    const entryFee = computeEntryFee(body.size, body.leverage, entryFeeRate);

    const [position] = await db
      .insert(schema.positions)
      .values({
        userId: session.userId,
        symbol: body.symbol.toUpperCase(),
        side: body.side,
        entryPrice: body.entryPrice,
        size: body.size,
        leverage: body.leverage,
        entryOrderType: orderType,
        entryFeeRate,
        entryFee,
      })
      .returning();

    return Response.json(position, { status: 201 });
  } catch (err) {
    console.error('[positions POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
