"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectHandler = createProjectHandler;
exports.getProjectsHandler = getProjectsHandler;
exports.getProjectByIdHandler = getProjectByIdHandler;
exports.updateProjectHandler = updateProjectHandler;
exports.deleteProjectHandler = deleteProjectHandler;
const project_service_1 = require("./project.service");
function isValidPostgresUrl(value) {
    try {
        const parsed = new URL(value);
        return parsed.protocol === "postgres:" || parsed.protocol === "postgresql:";
    }
    catch {
        return false;
    }
}
async function createProjectHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { name, databaseUrl } = req.body;
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
    const project = await (0, project_service_1.createProject)({
        name: name.trim(),
        databaseUrl: databaseUrl.trim(),
        userId: req.user.userId,
    });
    res.status(201).json(project);
}
async function getProjectsHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const projects = await (0, project_service_1.getProjectsByUserId)(req.user.userId);
    res.json(projects);
}
async function getProjectByIdHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid project ID" });
        return;
    }
    const project = await (0, project_service_1.getProjectById)(id, req.user.userId);
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    res.json(project);
}
async function updateProjectHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid project ID" });
        return;
    }
    const { name, databaseUrl } = req.body;
    if (name !== undefined && (typeof name !== "string" || name.trim().length === 0)) {
        res.status(400).json({ error: "Field 'name' must be a non-empty string." });
        return;
    }
    if (databaseUrl !== undefined) {
        if (typeof databaseUrl !== "string" || databaseUrl.trim().length === 0) {
            res
                .status(400)
                .json({ error: "Field 'databaseUrl' must be a non-empty string." });
            return;
        }
        if (!isValidPostgresUrl(databaseUrl)) {
            res
                .status(400)
                .json({ error: "Field 'databaseUrl' must be a valid PostgreSQL connection string." });
            return;
        }
    }
    if (name === undefined && databaseUrl === undefined) {
        res.status(400).json({ error: "At least one of 'name' or 'databaseUrl' is required." });
        return;
    }
    const project = await (0, project_service_1.updateProject)(id, req.user.userId, {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(databaseUrl !== undefined ? { databaseUrl: databaseUrl.trim() } : {}),
    });
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    res.json(project);
}
async function deleteProjectHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
        res.status(400).json({ error: "Invalid project ID" });
        return;
    }
    const deleted = await (0, project_service_1.deleteProject)(id, req.user.userId);
    if (!deleted) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    res.status(204).send();
}
