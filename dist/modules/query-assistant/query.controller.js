"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAssistantHandler = queryAssistantHandler;
const query_service_1 = require("./query.service");
function parseProjectId(value) {
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
async function queryAssistantHandler(req, res) {
    const { projectId, question } = req.body;
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
        const result = await (0, query_service_1.runQuestionQuery)(parsedProjectId, question.trim());
        res.json(result);
    }
    catch (error) {
        if (error instanceof query_service_1.ProjectNotFoundError) {
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
