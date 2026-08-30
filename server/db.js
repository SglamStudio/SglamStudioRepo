import pg from 'pg';
import { config } from './config.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: config.DATABASE_URL,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : undefined,
  max: config.DATABASE_POOL_MAX,
  idleTimeoutMillis: process.env.VERCEL ? 10_000 : 30_000,
  connectionTimeoutMillis: 10_000,
  allowExitOnIdle: Boolean(process.env.VERCEL)
});

export async function withTransaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
