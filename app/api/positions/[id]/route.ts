import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth-server';
import {
  DEFAULT_FEE_RATES,
  computeExitFee,
  computeRealizedPnl,
  exitRateFor,
  isOrderType,
  isValidRate,
  type OrderType,
} from '@/lib/fees';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json() as {
      closePrice: number;
      exitOrderType?: string;
      exitFeeRate?: number; // optional override
    };
    if (!body.closePrice || body.closePrice <= 0) {
      return Response.json({ error: 'Invalid close price' }, { status: 400 });
    }

    const exitOrderType: OrderType = isOrderType(body.exitOrderType)
      ? body.exitOrderType
      : 'market';

    // Fetch the position first to compute realized P&L
    const [pos] = await db
      .select()
      .from(schema.positions)
      .where(and(eq(schema.positions.id, id), eq(schema.positions.userId, session.userId)))
      .limit(1);

    if (!pos) return Response.json({ error: 'Position not found' }, { status: 404 });
    if (pos.closedAt) return Response.json({ error: 'Position already closed' }, { status: 400 });

    let exitFeeRate: number;
    if (body.exitFeeRate !== undefined) {
      if (!isValidRate(body.exitFeeRate)) {
        return Response.json({ error: 'Invalid exitFeeRate (must be 0–0.01)' }, { status: 400 });
      }
      exitFeeRate = body.exitFeeRate;
    } else {
      const [settings] = await db
        .select()
        .from(schema.userSettings)
        .where(eq(schema.userSettings.userId, session.userId))
        .limit(1);
      const rates = settings ?? DEFAULT_FEE_RATES;
      exitFeeRate = exitRateFor(rates, exitOrderType);
    }

    const entryFee = pos.entryFee ?? 0;
    const exitFee = computeExitFee(
      pos.size,
      pos.leverage,
      pos.entryPrice,
      body.closePrice,
      exitFeeRate
    );
    const totalFees = entryFee + exitFee;
    if (pos.side !== 'long' && pos.side !== 'short') {
      return Response.json({ error: 'Position has invalid side value' }, { status: 500 });
    }
    const realizedPnl = computeRealizedPnl({
      side: pos.side,
      entryPrice: pos.entryPrice,
      closePrice: body.closePrice,
      size: pos.size,
      leverage: pos.leverage,
      entryFee,
      exitFee,
    });

    const [updated] = await db
      .update(schema.positions)
      .set({
        closedAt: new Date(),
        closePrice: body.closePrice,
        exitOrderType,
        exitFeeRate,
        exitFee,
        totalFees,
        realizedPnl,
      })
      .where(and(eq(schema.positions.id, id), eq(schema.positions.userId, session.userId)))
      .returning();

    return Response.json(updated);
  } catch (err) {
    console.error('[positions PATCH]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  await db
    .delete(schema.positions)
    .where(and(eq(schema.positions.id, id), eq(schema.positions.userId, session.userId)));

  return Response.json({ ok: true });
}
