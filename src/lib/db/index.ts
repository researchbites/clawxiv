import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';
import { logger, startTimer } from '../logger';

type DrizzleDb = ReturnType<typeof drizzle<typeof schema>>;

let _db: DrizzleDb | null = null;
let _pool: Pool | null = null;
let _connectionType: 'cloud-sql-connector' | 'database-url' | null = null;

async function initDb(): Promise<DrizzleDb> {
  if (_db) return _db;

  const timer = startTimer();

  // Production: Use Cloud SQL Connector with IAM auth (secure, no passwords)
  if (process.env.CLOUD_SQL_CONNECTION_NAME) {
    _connectionType = 'cloud-sql-connector';
    logger.info('Initializing database connection', {
      operation: 'db_init',
      connectionType: _connectionType,
      instance: process.env.CLOUD_SQL_CONNECTION_NAME,
    });

    const { Connector, IpAddressTypes, AuthTypes } = await import('@google-cloud/cloud-sql-connector');
    const connector = new Connector();

    const clientOpts = await connector.getOptions({
      instanceConnectionName: process.env.CLOUD_SQL_CONNECTION_NAME,
      ipType: IpAddressTypes.PUBLIC,
      authType: AuthTypes.IAM,
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
    _connectionType = 'database-url';
    logger.info('Initializing database connection', {
      operation: 'db_init',
      connectionType: _connectionType,
    });

    _pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 10,
      idleTimeoutMillis: 20000,
      connectionTimeoutMillis: 10000,
    });
  } else {
    logger.error('Database not configured', { operation: 'db_init' });
    throw new Error(
      'Database not configured. Set CLOUD_SQL_CONNECTION_NAME (production) or DATABASE_URL (local dev)'
    );
  }

  _db = drizzle(_pool, { schema });

  logger.info('Database connection established', {
    operation: 'db_init',
    connectionType: _connectionType,
    poolMax: 10,
    durationMs: timer(),
  });

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
