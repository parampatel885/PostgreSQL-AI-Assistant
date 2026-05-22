"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndStoreTableEmbedding = generateAndStoreTableEmbedding;
const prisma_1 = __importDefault(require("../../config/prisma"));
const embeddings_1 = require("../../utils/embeddings");
async function generateAndStoreTableEmbedding(tableId, tableName, columns) {
    const columnParts = columns.map((c) => `${c.columnName} (${c.dataType})`);
    const text = `table: ${tableName}, columns: ${columnParts.join(", ")}`;
    const embedding = await (0, embeddings_1.generateEmbedding)(text);
    const vectorLiteral = `[${embedding.join(",")}]`;
    await prisma_1.default.$executeRawUnsafe(`UPDATE schema_tables SET embedding = $1::vector WHERE id = $2`, vectorLiteral, tableId);
}
