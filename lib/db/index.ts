import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import * as schema from './schema';

// Lazily initialised so missing DATABASE_URL only blows up at request time, not build time.
function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('DATABASE_URL environment variable is not set');
  return drizzle(neon(url), { schema });
}

export const db = getDb();
export { schema };
