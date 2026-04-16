import { eq } from 'drizzle-orm';
import { db, schema } from '@/lib/db';
import { sessionCookie, signJWT, verifyPassword } from '@/lib/auth-server';

export async function POST(req: Request) {
  try {
    const { username, password } = await req.json() as { username?: string; password?: string };

    if (!username || !password) {
      return Response.json({ error: 'Username and password are required' }, { status: 400 });
    }

    const [user] = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.username, username.trim().toLowerCase()))
      .limit(1);

    if (!user) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      return Response.json({ error: 'Invalid credentials' }, { status: 401 });
    }

    const token = await signJWT({ userId: user.id, username: user.username });

    return Response.json(
      { username: user.username },
      { headers: { 'Set-Cookie': sessionCookie(token) } }
    );
  } catch (err) {
    console.error('[login]', err);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
