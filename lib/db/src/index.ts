import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const devMockApi =
  process.env.NODE_ENV !== "production" && process.env.DEV_MOCK_API === "true";
const databaseUrl = process.env.DATABASE_URL ?? (
  devMockApi ? "postgres://unused:unused@127.0.0.1:1/unused" : undefined
);

if (!databaseUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: databaseUrl });
export const db = drizzle(pool, { schema });

export * from "./schema";
