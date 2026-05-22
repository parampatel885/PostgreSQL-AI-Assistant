"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProjectHandler = createProjectHandler;
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
