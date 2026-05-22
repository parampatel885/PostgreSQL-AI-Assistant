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
function buildQueryPrompt(question, schema, relationships) {
    const schemaLines = schema.map((table) => `Table: ${table.tableName} (${table.columns.join(", ")})`);
    const relationshipLines = relationships.map((relationship) => `${relationship.fromTable}.${relationship.fromColumn} -> ${relationship.toTable}.${relationship.toColumn}`);
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
