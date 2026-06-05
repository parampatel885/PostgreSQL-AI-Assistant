"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildQueryPromptAsync = buildQueryPromptAsync;
exports.buildQueryPrompt = buildQueryPrompt;
const semantic_search_service_1 = require("../schema-introspection/semantic-search.service");
function filterRelationshipsForSchema(relationships, schema) {
    const names = new Set(schema.map((table) => table.tableName));
    return relationships.filter((relationship) => names.has(relationship.fromTable) && names.has(relationship.toTable));
}
async function buildQueryPromptAsync(projectId, userQuestion, relationships) {
    const tableNames = await (0, semantic_search_service_1.searchRelevantTables)(projectId, userQuestion, 5);
    let schema = tableNames.length > 0 ? await (0, semantic_search_service_1.loadSchemaTablesForProject)(projectId, tableNames) : [];
    if (schema.length === 0) {
        schema = await (0, semantic_search_service_1.loadSchemaTablesForProject)(projectId, null);
    }
    const filteredRelationships = filterRelationshipsForSchema(relationships, schema);
    return buildQueryPrompt(userQuestion, schema, filteredRelationships);
}
const FORBIDDEN_KEYWORDS = [
    "INSERT", "UPDATE", "DELETE", "DROP", "ALTER",
    "TRUNCATE", "CREATE", "GRANT", "REVOKE", "EXECUTE",
    "CALL", "MERGE", "REPLACE"
];
function buildQueryPrompt(question, schema, relationships) {
    const schemaLines = schema.map((table) => `Table: ${table.tableName} (${table.columns.join(", ")})`);
    const relationshipLines = relationships.map((relationship) => `${relationship.fromTable}.${relationship.fromColumn} -> ${relationship.toTable}.${relationship.toColumn}`);
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
