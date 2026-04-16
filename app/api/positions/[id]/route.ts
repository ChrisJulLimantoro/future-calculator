import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth-server';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(req);
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;

  try {
    const body = await req.json() as { closePrice: number };
    if (!body.closePrice || body.closePrice <= 0) {
      return Response.json({ error: 'Invalid close price' }, { status: 400 });
    }

    // Fetch the position first to compute realized P&L
    const [pos] = await db
      .select()
      .from(schema.positions)
      .where(and(eq(schema.positions.id, id), eq(schema.positions.userId, session.userId)))
      .limit(1);

    if (!pos) return Response.json({ error: 'Position not found' }, { status: 404 });
    if (pos.closedAt) return Response.json({ error: 'Position already closed' }, { status: 400 });

    const direction = pos.side === 'long' ? 1 : -1;
    const realizedPnl =
      direction * ((body.closePrice - pos.entryPrice) / pos.entryPrice) * pos.size * pos.leverage;

    const [updated] = await db
      .update(schema.positions)
      .set({ closedAt: new Date(), closePrice: body.closePrice, realizedPnl })
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
