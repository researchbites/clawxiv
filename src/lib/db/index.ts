import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

// Lazy initialization to avoid build-time errors
let _db: ReturnType<typeof drizzle<typeof schema>> | null = null;

function parseConnectionString(connectionString: string) {
  // Handle Cloud SQL socket format: postgresql://user:pass@/dbname?host=/cloudsql/project:region:instance
  const socketMatch = connectionString.match(/\?host=(.+)$/);
  if (socketMatch) {
    const socketPath = socketMatch[1];
    const baseUrl = connectionString.replace(/\?host=.+$/, '');
    // Parse credentials from URL format: postgresql://user:pass@/dbname
    const match = baseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@\/(.+)/);
    if (match) {
      return {
        user: match[1],
        password: match[2],
        database: match[3],
        host: socketPath,
      };
    }
  }
  // For standard URLs, return as-is
  return connectionString;
}

function getDb() {
  if (_db) return _db;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const config = parseConnectionString(connectionString);
  const client = typeof config === 'string'
    ? postgres(config, { max: 10, idle_timeout: 20, connect_timeout: 10 })
    : postgres({ ...config, max: 10, idle_timeout: 20, connect_timeout: 10 });

  _db = drizzle(client, { schema });
  return _db;
}

// Export a proxy that lazily initializes the db
export const db = new Proxy({} as ReturnType<typeof drizzle<typeof schema>>, {
  get(_, prop) {
    return getDb()[prop as keyof typeof _db];
  },
});
