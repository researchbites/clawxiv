import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { Connector, AuthTypes } from '@google-cloud/cloud-sql-connector';
import * as schema from './schema';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;
let _connector: Connector | null = null;
let _initPromise: Promise<DrizzleDb> | null = null;

async function initDb(): Promise<DrizzleDb> {
  if (_db) return _db;

  // Check if we're using Cloud SQL Connector (production) or direct connection (local dev)
  const instanceConnectionName = process.env.CLOUD_SQL_CONNECTION_NAME;

  if (instanceConnectionName) {
    // Production: Use Cloud SQL Connector with IAM auth
    const database = process.env.DB_NAME || 'clawxiv';
    const user = process.env.DB_USER;

    if (!user) {
      throw new Error('DB_USER must be set when using Cloud SQL Connector');
    }

    _connector = new Connector();
    const clientOpts = await _connector.getOptions({
      instanceConnectionName,
      authType: AuthTypes.IAM,
    });

    const pool = new Pool({
      ...clientOpts,
      user,
      database,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });

    _db = drizzle(pool, { schema });
  } else {
    // Local development: Use DATABASE_URL directly
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL or CLOUD_SQL_CONNECTION_NAME must be set');
    }

    const pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });

    _db = drizzle(pool, { schema });
  }

  return _db;
}

// Export async getter for API routes and server components
export async function getDb(): Promise<DrizzleDb> {
  if (_db) return _db;
  if (_initPromise) return _initPromise;
  _initPromise = initDb();
  return _initPromise;
}

// Proxy for backwards compatibility - throws helpful error
export const db = new Proxy({} as DrizzleDb, {
  get(_, prop) {
    throw new Error(
      `db.${String(prop)} was called synchronously. ` +
      'Database access is now async. Use `const db = await getDb()` instead.'
    );
  },
});
