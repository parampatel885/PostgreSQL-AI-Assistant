const FORBIDDEN_KEYWORDS = ["INSERT", "UPDATE", "DELETE", "DROP", "ALTER"];

export function validateSql(sql: string): void {
  const trimmedSql = sql.trim();
  const uppercaseSql = trimmedSql.toUpperCase();

  if (!uppercaseSql.startsWith("SELECT")) {
    throw new Error("Only SELECT queries are allowed.");
  }

  for (const keyword of FORBIDDEN_KEYWORDS) {
    if (uppercaseSql.includes(keyword)) {
      throw new Error(`Query contains forbidden keyword: ${keyword}.`);
    }
  }
}
