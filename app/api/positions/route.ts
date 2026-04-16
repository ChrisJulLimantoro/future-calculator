import { and, eq, isNull } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { getSession } from '@/lib/auth-server';

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
    };

    if (!body.symbol || !body.side || !body.entryPrice || !body.size || !body.leverage) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const [position] = await db
      .insert(schema.positions)
      .values({
        userId: session.userId,
        symbol: body.symbol.toUpperCase(),
        side: body.side,
        entryPrice: body.entryPrice,
        size: body.size,
        leverage: body.leverage,
      })
      .returning();

    return Response.json(position, { status: 201 });
  } catch (err) {
    console.error('[positions POST]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
