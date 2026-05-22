"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchRelevantTables = searchRelevantTables;
exports.loadSchemaTablesForProject = loadSchemaTablesForProject;
const prisma_1 = __importDefault(require("../../config/prisma"));
const embeddings_1 = require("../../utils/embeddings");
async function searchRelevantTables(projectId, userQuestion, limit = 5) {
    const embedding = await (0, embeddings_1.generateEmbedding)(userQuestion);
    const vectorLiteral = `[${embedding.join(",")}]`;
    const rows = await prisma_1.default.$queryRawUnsafe(`
      SELECT table_name
      FROM schema_tables
      WHERE project_id = $1
        AND embedding IS NOT NULL
      ORDER BY embedding <=> $2::vector
      LIMIT $3
    `, projectId, vectorLiteral, limit);
    return rows.map((row) => row.table_name);
}
async function loadSchemaTablesForProject(projectId, tableNames) {
    const where = tableNames && tableNames.length > 0
        ? { projectId, tableName: { in: tableNames } }
        : { projectId };
    const rows = await prisma_1.default.schemaTable.findMany({
        where,
        include: {
            columns: {
                orderBy: { columnName: "asc" },
                select: { columnName: true },
            },
        },
        orderBy: { tableName: "asc" },
    });
    return rows.map((row) => ({
        tableName: row.tableName,
        columns: row.columns.map((c) => c.columnName),
    }));
}
