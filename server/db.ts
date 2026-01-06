import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    // Accept self-signed certs when necessary (e.g. some managed DBs)
    rejectUnauthorized: false,
  },
  // Force IPv4 to avoid environments that cannot reach IPv6 addresses
  family: 4,
} as unknown as pg.PoolConfig);

export const db = drizzle(pool, { schema });