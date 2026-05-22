"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectProjectSchemaHandler = introspectProjectSchemaHandler;
const introspection_service_1 = require("./introspection.service");
function parseProjectId(value) {
    if (!value) {
        return null;
    }
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return null;
    }
    return parsed;
}
async function introspectProjectSchemaHandler(req, res) {
    const projectId = parseProjectId(req.params.projectId);
    if (projectId === null) {
        res.status(400).json({ error: "'projectId' must be a positive integer." });
        return;
    }
    try {
        const result = await (0, introspection_service_1.introspectAndSaveSchema)(projectId);
        res.json(result);
    }
    catch (error) {
        if (error instanceof introspection_service_1.ProjectNotFoundError) {
            res.status(404).json({ error: error.message });
            return;
        }
        throw error;
    }
}
