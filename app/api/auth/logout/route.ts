import { clearCookie } from '@/lib/auth-server';

export async function POST() {
  return Response.json({ ok: true }, { headers: { 'Set-Cookie': clearCookie() } });
}
