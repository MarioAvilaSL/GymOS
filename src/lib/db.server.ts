import { Pool } from "pg";

// Global singleton in dev to avoid multiple pools on HMR reloads.
declare global {
  // eslint-disable-next-line no-var
  var __gymosPgPool: Pool | undefined;
}

function createPool() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL no está definido. Copia .env.example a .env y configura la conexión a tu PostgreSQL local.",
    );
  }
  return new Pool({ connectionString, max: 10 });
}

export const pool: Pool = globalThis.__gymosPgPool ?? createPool();
if (!globalThis.__gymosPgPool) globalThis.__gymosPgPool = pool;

export async function query<T = Record<string, unknown>>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  const res = await pool.query(text, params as never);
  return res.rows as T[];
}
