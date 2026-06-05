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
import {
  isPostgresConnectionError,
  logIntrospectionError,
  logIntrospectionStep,
  logPostgresConnectionError,
} from "./introspection.logger";

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
  logIntrospectionStep("Starting introspection for project", { projectId });

  const normalizedProjectId = BigInt(projectId);
  let project: { id: bigint; databaseUrl: string } | null = null;

  try {
    logIntrospectionStep("Reading project from platform database", { projectId });
    project = await prisma.project.findUnique({
      where: {
        id: normalizedProjectId,
      },
      select: {
        id: true,
        databaseUrl: true,
      },
    });
    logIntrospectionStep("Reading project from platform database completed", {
      projectId,
      found: Boolean(project),
    });
  } catch (error) {
    logIntrospectionError("Reading project from platform database", error, { projectId });
    throw error;
  }

  if (!project) {
    const notFoundError = new ProjectNotFoundError(projectId);
    logIntrospectionError("Project not found in platform database", notFoundError, { projectId });
    throw notFoundError;
  }

  let decryptedUrl: string;
  try {
    decryptedUrl = decrypt(project.databaseUrl);
  } catch (error) {
    logIntrospectionError("Decrypting project database URL", error, { projectId });
    throw error;
  }

  let introspection: IntrospectionResult;
  try {
    introspection = await introspectPostgresSchema(decryptedUrl);
  } catch (error) {
    if (isPostgresConnectionError(error)) {
      logPostgresConnectionError("Introspecting target PostgreSQL database", error, decryptedUrl, {
        projectId,
      });
    } else {
      logIntrospectionError("Introspecting target PostgreSQL database", error, { projectId });
    }
    throw error;
  }

  const columnsByTable = groupColumnsByTable(introspection.columns);

  try {
    logIntrospectionStep("Writing schema metadata", {
      projectId,
      tableCount: introspection.tables.length,
      columnCount: introspection.columns.length,
      relationshipCount: introspection.relationships.length,
    });

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

    logIntrospectionStep("Writing schema metadata completed", { projectId });
  } catch (error) {
    logIntrospectionError("Writing schema metadata", error, { projectId });
    throw error;
  }

  try {
    logIntrospectionStep("Generating table embeddings", { projectId });

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

    logIntrospectionStep("Generating table embeddings completed", {
      projectId,
      tableCount: tablesWithColumns.length,
    });
  } catch (error) {
    logIntrospectionError("Generating table embeddings", error, { projectId });
    throw error;
  }

  logIntrospectionStep("Introspection completed", { projectId });

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
