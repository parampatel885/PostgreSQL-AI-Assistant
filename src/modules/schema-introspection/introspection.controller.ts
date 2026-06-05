import { Request, Response } from "express";
import { introspectAndSaveSchema, ProjectNotFoundError } from "./introspection.service";
import prisma from "../../config/prisma";
import {
  buildIntrospectionErrorBody,
  logIntrospectionError,
} from "./introspection.logger";

function parseProjectId(value: string | undefined): number | null {
  if (!value) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return null;
  }

  return parsed;
}

export async function introspectProjectSchemaHandler(req: Request, res: Response): Promise<void> {
  const projectId = parseProjectId(req.params.projectId);

  if (projectId === null) {
    res.status(400).json({ error: "'projectId' must be a positive integer." });
    return;
  }

  try {
    const result = await introspectAndSaveSchema(projectId);
    res.json(result);
  } catch (error: unknown) {
    logIntrospectionError("Introspection request failed", error, { projectId });

    if (error instanceof ProjectNotFoundError) {
      res.status(404).json(buildIntrospectionErrorBody(error, projectId));
      return;
    }

    res.status(500).json(buildIntrospectionErrorBody(error, projectId));
  }
}

export async function getProjectSchemaHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = parseProjectId(req.params.projectId);
  if (projectId === null) {
    res.status(400).json({ error: "'projectId' must be a positive integer." });
    return;
  }

  // Verify project belongs to user
  const project = await prisma.project.findFirst({
    where: { id: BigInt(projectId), userId: req.user.userId },
  });

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const schemaTables = await prisma.schemaTable.findMany({
    where: { projectId: BigInt(projectId) },
    orderBy: { tableName: "asc" },
    include: {
      columns: {
        orderBy: { columnName: "asc" },
      },
    },
  });

  const tables = schemaTables.map(t => ({ tableName: t.tableName }));
  const columns = schemaTables.flatMap(t =>
    t.columns.map(c => ({
      tableName: t.tableName,
      columnName: c.columnName,
      dataType: c.dataType,
      isNullable: c.isNullable,
    }))
  );

  res.json({ tables, columns });
}