import { Pool } from "pg";
import { env } from "./env";

export const pool = new Pool({
  connectionString: env.databaseUrl,
});

export async function testPlatformDbConnection(): Promise<void> {
  await pool.query("SELECT 1");
}
