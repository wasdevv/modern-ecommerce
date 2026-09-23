import postgres from 'postgres';

declare global {
  // Reused across hot reloads in dev so each edit doesn't open a new pool.
  var __sql: postgres.Sql | undefined;
}

export const dbConfigured = () => !!process.env.DATABASE_URL;

export function db() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');
  globalThis.__sql ??= postgres(process.env.DATABASE_URL, { max: 5, onnotice: () => {} });
  return globalThis.__sql;
}
