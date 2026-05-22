import { Client } from "pg";

export async function runSelectSql(databaseUrl: string, sql: string): Promise<unknown[]> {
  const client = new Client({ connectionString: databaseUrl });

  await client.connect();

  try {
    const result = await client.query(sql);
    return result.rows;
  } finally {
    await client.end();
  }
}
