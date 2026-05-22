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
    "You are a PostgreSQL SQL generator.",
    "",
    "Use ONLY the given schema.",
    "Generate ONLY one PostgreSQL SELECT query.",
    "Do not explain anything.",
    "Do not use markdown.",
    "Do not wrap the SQL in ```.",
    "Do not generate INSERT, UPDATE, DELETE, DROP, ALTER, TRUNCATE, or CREATE.",
    "If the result can be large, add LIMIT 50.",
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
