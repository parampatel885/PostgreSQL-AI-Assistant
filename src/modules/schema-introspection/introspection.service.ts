import prisma from "../../config/prisma";
import { generateAndStoreTableEmbedding } from "./embedding.service";
import {
  introspectPostgresSchema,
  IntrospectionResult,
  IntrospectedColumn,
  IntrospectedRelationship,
  IntrospectedTable,
} from "./postgres-introspector";
import { decrypt } from "../../utils/crypto";
export class ProjectNotFoundError extends Error {
  constructor(projectId: number) {
    super(`Project with id '${projectId}' not found.`);
    this.name = "ProjectNotFoundError";
  }
}

function groupColumnsByTable(columns: IntrospectedColumn[]): Map<string, IntrospectedColumn[]> {
  const map = new Map<string, IntrospectedColumn[]>();

  for (const column of columns) {
    const existing = map.get(column.tableName) ?? [];
    existing.push(column);
    map.set(column.tableName, existing);
  }

  return map;
}

export async function introspectAndSaveSchema(projectId: number): Promise<IntrospectionResult> {
  const normalizedProjectId = BigInt(projectId);
  const project = await prisma.project.findUnique({
    where: {
      id: normalizedProjectId,
    },
    select: {
      id: true,
      databaseUrl: true,
    },
  });

  if (!project) {
    throw new ProjectNotFoundError(projectId);
  }
  
  const decryptedUrl = decrypt(project.databaseUrl);
  const introspection = await introspectPostgresSchema(decryptedUrl);
  const columnsByTable = groupColumnsByTable(introspection.columns);
  await prisma.$transaction(async (tx: any) => {
    await tx.schemaTable.deleteMany({
      where: {
        projectId: normalizedProjectId,
      },
    });

    await tx.schemaRelationship.deleteMany({
      where: {
        projectId: normalizedProjectId,
      },
    });

    for (const table of introspection.tables) {
      const insertedTable = await tx.schemaTable.create({
        data: {
          projectId: normalizedProjectId,
          tableName: table.tableName,
        },
        select: {
          id: true,
        },
      });

      const tableColumns = columnsByTable.get(table.tableName) ?? [];

      if (tableColumns.length > 0) {
        await tx.schemaColumn.createMany({
          data: tableColumns.map((column) => ({
            tableId: insertedTable.id,
            columnName: column.columnName,
            dataType: column.dataType,
            isNullable: column.isNullable,
          })),
        });
      }
    }

    if (introspection.relationships.length > 0) {
      await tx.schemaRelationship.createMany({
        data: introspection.relationships.map((relationship) => ({
          projectId: normalizedProjectId,
          fromTable: relationship.fromTable,
          fromColumn: relationship.fromColumn,
          toTable: relationship.toTable,
          toColumn: relationship.toColumn,
        })),
      });
    }
  });

  const tablesWithColumns = await prisma.schemaTable.findMany({
    where: { projectId: normalizedProjectId },
    select: {
      id: true,
      tableName: true,
      columns: {
        orderBy: { columnName: "asc" },
        select: { columnName: true, dataType: true },
      },
    },
    orderBy: { tableName: "asc" },
  });

  for (const table of tablesWithColumns) {
    await generateAndStoreTableEmbedding(
      table.id,
      table.tableName,
      table.columns.map((column) => ({
        columnName: column.columnName,
        dataType: column.dataType,
      }))
    );
  }

  return {
    tables: introspection.tables.map((table: IntrospectedTable) => ({
      tableName: table.tableName,
    })),
    columns: introspection.columns.map((column: IntrospectedColumn) => ({
      tableName: column.tableName,
      columnName: column.columnName,
      dataType: column.dataType,
      isNullable: column.isNullable,
    })),
    relationships: introspection.relationships.map((relationship: IntrospectedRelationship) => ({
      fromTable: relationship.fromTable,
      fromColumn: relationship.fromColumn,
      toTable: relationship.toTable,
      toColumn: relationship.toColumn,
    })),
  };
}
