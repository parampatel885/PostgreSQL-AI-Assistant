import { Request, Response } from "express";
import { ProjectNotFoundError, runQuestionQuery } from "./query.service";
import prisma from "../../config/prisma";

interface QueryBody {
  projectId?: unknown;
  question?: unknown;
}

function parseProjectId(value: unknown): number | null {
  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  return null;
}

export async function queryAssistantHandler(req: Request, res: Response): Promise<void> {
  const { projectId, question } = req.body as QueryBody;
  const parsedProjectId = parseProjectId(projectId);

  if (parsedProjectId === null) {
    res.status(400).json({ error: "Field 'projectId' must be a positive integer or numeric string." });
    return;
  }

  if (typeof question !== "string" || question.trim().length === 0) {
    res.status(400).json({ error: "Field 'question' is required and must be a non-empty string." });
    return;
  }

  try {
    const result = await runQuestionQuery(parsedProjectId, question.trim());
    res.json(result);
  } catch (error) {
    if (error instanceof ProjectNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    if (error instanceof Error) {
      res.status(400).json({ error: error.message });
      return;
    }

    throw error;
  }
}
export async function getQueryLogsHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projectId = parseInt(req.params.projectId);
  if (isNaN(projectId)) {
    res.status(400).json({ error: "Invalid project ID" });
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

  const logs = await prisma.queryLog.findMany({
    where: { projectId: BigInt(projectId) },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: { id: true, query: true, sql: true, createdAt: true },
  });

  res.json(logs.map(log => ({
    id: Number(log.id),
    query: log.query,
    sql: log.sql,
    createdAt: log.createdAt.toISOString(),
  })));
}