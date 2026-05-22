import { Request, Response } from "express";
import { ProjectNotFoundError, runQuestionQuery } from "./query.service";

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
