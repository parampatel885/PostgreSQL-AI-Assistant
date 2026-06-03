import prisma from "../../config/prisma";
import { generateEmbedding } from "../../utils/embeddings";

export async function searchRelevantTables(
  projectId: bigint,
  userQuestion: string,
  limit: number = 5
): Promise<string[]> {
  const embedding = await generateEmbedding(userQuestion);
  const vectorLiteral = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string; distance: number }>>(
    `
      SELECT table_name, embedding <=> $2::vector AS distance
      FROM schema_tables
      WHERE project_id = $1
        AND embedding IS NOT NULL
        AND embedding <=> $2::vector < 0.65
      ORDER BY embedding <=> $2::vector
      LIMIT $3
    `,
    projectId,
    vectorLiteral,
    limit
  );

  return rows.map((row) => row.table_name);
}

export async function loadSchemaTablesForProject(
  projectId: bigint,
  tableNames: string[] | null
): Promise<{ tableName: string; columns: string[] }[]> {
  const where =
    tableNames && tableNames.length > 0
      ? { projectId, tableName: { in: tableNames } as const }
      : { projectId };

  const rows = await prisma.schemaTable.findMany({
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
