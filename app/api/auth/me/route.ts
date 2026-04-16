import { getSession } from '@/lib/auth-server';

export async function GET(req: Request) {
  const session = await getSession(req);
  if (!session) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return Response.json({ userId: session.userId, username: session.username });
}
