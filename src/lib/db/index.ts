import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;

function initDb(): DrizzleDb {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL must be set');
  }

  const pool = new Pool({
    connectionString,
    max: 10,
    idleTimeoutMillis: 20000,
    connectionTimeoutMillis: 10000,
  });

  _db = drizzle(pool, { schema });
  return _db;
}

// Export async getter for API routes and server components
export async function getDb(): Promise<DrizzleDb> {
  return initDb();
}

// Proxy for backwards compatibility - throws helpful error
export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    throw new Error(
      `db.${String(prop)} was called synchronously. ` +
      'Use `const db = await getDb()` instead.'
    );
  },
});
