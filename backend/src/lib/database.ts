import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../../database/schema";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL!,
  max: 20,
  idleTimeoutMillis: 10_000,
  connectionTimeoutMillis: 30_000,
});

const poolReadonly = new Pool({
  connectionString: process.env.DATABASE_URL_READONLY ?? process.env.DATABASE_URL!,
  max: 10,
  idleTimeoutMillis: 10_000,
});

export const db = drizzle(pool, { schema });
export const dbRead = drizzle(poolReadonly, { schema });
