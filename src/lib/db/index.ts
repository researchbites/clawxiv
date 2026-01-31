import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;
let _pool: Pool | null = null;

async function initDb(): Promise<DrizzleDb> {
  if (_db) return _db;

  // Production: Use Cloud SQL Connector with IAM auth (secure, no passwords)
  if (process.env.CLOUD_SQL_CONNECTION_NAME) {
    const { Connector } = await import('@google-cloud/cloud-sql-connector');
    const connector = new Connector();

    const clientOpts = await connector.getOptions({
      instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME,
      ipType: 'PUBLIC',
      authType: 'IAM',
    });

    _pool = new Pool({
      ...clientOpts,
      user: process.env.DB_USER,
      database: process.env.DB_NAME,
      max: 10,
    });
  }
  // Local dev: Use DATABASE_URL (via Cloud SQL Proxy or local PostgreSQL)
  else if (process.env.DATABASE_URL) {
    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });
  } else {
    throw new Error(
      'Database not configured. Set CLOUD_SQL_CONNECTION_NAME (production) or DATABASE_URL (local dev)'
    );
  }

  _db = drizzle(_pool, { schema });
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
