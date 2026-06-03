import {
  loadSchemaTablesForProject,
  searchRelevantTables,
} from "../schema-introspection/semantic-search.service";

export interface SchemaTable {
  tableName: string;
  columns: string[];
}

export interface SchemaRelationship {
  fromTable: string;
  fromColumn: string;
  toTable: string;
  toColumn: string;
}

function filterRelationshipsForSchema(
  relationships: SchemaRelationship[],
  schema: SchemaTable[]
): SchemaRelationship[] {
  const names = new Set(schema.map((table) => table.tableName));
  return relationships.filter(
    (relationship) => names.has(relationship.fromTable) && names.has(relationship.toTable)
  );
}

export async function buildQueryPromptAsync(
  projectId: bigint,
  userQuestion: string,
  relationships: SchemaRelationship[]
): Promise<string> {
  const tableNames = await searchRelevantTables(projectId, userQuestion, 5);
  let schema: SchemaTable[] =
    tableNames.length > 0 ? await loadSchemaTablesForProject(projectId, tableNames) : [];

  if (schema.length === 0) {
    schema = await loadSchemaTablesForProject(projectId, null);
  }

  const filteredRelationships = filterRelationshipsForSchema(relationships, schema);
  return buildQueryPrompt(userQuestion, schema, filteredRelationships);
}

const FORBIDDEN_KEYWORDS = [
  "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
  "TRUNCATE", "CREATE", "GRANT", "REVOKE", "EXECUTE",
  "CALL", "MERGE", "REPLACE"
];

export function buildQueryPrompt(
  question: string,
  schema: SchemaTable[],
  relationships: SchemaRelationship[]
): string {
  const schemaLines = schema.map(
    (table) => `Table: ${table.tableName} (${table.columns.join(", ")})`
  );
  const relationshipLines = relationships.map(
    (relationship) =>
      `${relationship.fromTable}.${relationship.fromColumn} -> ${relationship.toTable}.${relationship.toColumn}`
  );

  return [
    "You are a READ-ONLY PostgreSQL query generator.",
    "Your ONLY job is to generate a single SELECT query.",
    "",
    "STRICT RULES — violating any rule is not allowed:",
    "1. Output ONLY raw SQL. No explanations, no markdown, no ``` backticks.",
    "2. ONLY generate SELECT statements. NEVER generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, CREATE, GRANT, or any other non-SELECT statement.",
    "3. If the user asks to add, update, delete, modify, or change data — respond with: SELECT 'Only read-only queries are supported' AS message;",
    "4. Use ONLY the tables and columns listed in the schema below.",
    "5. If the question cannot be answered with a SELECT query, respond with: SELECT 'This question cannot be answered with a read-only query' AS message;",
    "6. Always add LIMIT 50 unless the user asks for a specific number.",
    "",
    "Schema:",
    ...schemaLines,
    "",
    "Relationships:",
    ...(relationshipLines.length > 0 ? relationshipLines : ["None"]),
    "",
    "User question:",
    question,
    "",
    "SQL:",
  ].join("\n");
}