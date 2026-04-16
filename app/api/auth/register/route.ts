import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { hashPassword, sessionCookie, signJWT } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json() as { username?: string; password?: string };

    if (!username || username.trim().length < 3) {
      return Response.json({ error: 'Username must be at least 3 characters' }, { status: 400 });
    }
    if (!password || password.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 });
    }

    const existing = await db
      .select({ id: schema.users.id })
      .from(schema.users)
      .where(eq(schema.users.username, username.trim().toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return Response.json({ error: 'Username already taken' }, { status: 409 });
    }

    const passwordHash = await hashPassword(password);
    const [user] = await db
      .insert(schema.users)
      .values({ username: username.trim().toLowerCase(), passwordHash })
      .returning({ id: schema.users.id, username: schema.users.username });

    const token = await signJWT({ userId: user.id, username: user.username });

    return Response.json(
      { username: user.username },
      { headers: { 'Set-Cookie': sessionCookie(token) } }
    );
  } catch (err) {
    console.error('[register]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
