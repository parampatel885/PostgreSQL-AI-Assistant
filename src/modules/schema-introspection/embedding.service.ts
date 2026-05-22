import prisma from "../../config/prisma";
import { generateEmbedding } from "../../utils/embeddings";

export async function generateAndStoreTableEmbedding(
  tableId: bigint,
  tableName: string,
  columns: { columnName: string; dataType: string }[]
): Promise<void> {
  const columnParts = columns.map((c) => `${c.columnName} (${c.dataType})`);
  const text = `table: ${tableName}, columns: ${columnParts.join(", ")}`;

  const embedding = await generateEmbedding(text);
  const vectorLiteral = `[${embedding.join(",")}]`;

  await prisma.$executeRawUnsafe(
    `UPDATE schema_tables SET embedding = $1::vector WHERE id = $2`,
    vectorLiteral,
    tableId
  );
}
