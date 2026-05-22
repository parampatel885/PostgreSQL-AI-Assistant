import { Request, Response } from "express";
import { introspectAndSaveSchema, ProjectNotFoundError } from "./introspection.service";

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
    if (error instanceof ProjectNotFoundError) {
      res.status(404).json({ error: error.message });
      return;
    }

    throw error;
  }
}
