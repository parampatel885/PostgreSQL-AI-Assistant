import { Request, Response } from "express";
import { createProject } from "./project.service";
import { getProjectsByUserId, getProjectById } from "./project.service";

function isValidPostgresUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
  } catch {
    return false;
  }
}

export async function createProjectHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { name, databaseUrl } = req.body as { name?: unknown; databaseUrl?: unknown };

  if (typeof name !== "string" || name.trim().length === 0) {
    res.status(400).json({ error: "Field 'name' is required and must be a non-empty string." });
    return;
  }

  if (typeof databaseUrl !== "string" || databaseUrl.trim().length === 0) {
    res
      .status(400)
      .json({ error: "Field 'databaseUrl' is required and must be a non-empty string." });
    return;
  }

  if (!isValidPostgresUrl(databaseUrl)) {
    res
      .status(400)
      .json({ error: "Field 'databaseUrl' must be a valid PostgreSQL connection string." });
    return;
  }

  const project = await createProject({
    name: name.trim(),
    databaseUrl: databaseUrl.trim(),
    userId: req.user.userId,
  });

  res.status(201).json(project);
}

export async function getProjectsHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const projects = await getProjectsByUserId(req.user.userId);
  res.json(projects);
}

export async function getProjectByIdHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const id = parseInt(req.params.id);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid project ID" });
    return;
  }

  const project = await getProjectById(id, req.user.userId);
  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  res.json(project);
}