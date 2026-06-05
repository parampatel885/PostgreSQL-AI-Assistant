"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAssistantHandler = queryAssistantHandler;
exports.getQueryLogsHandler = getQueryLogsHandler;
const query_service_1 = require("./query.service");
const prisma_1 = __importDefault(require("../../config/prisma"));
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
        if (error instanceof Error) {
            console.error("QUERY ERROR:", error);
            res.status(400).json({
                error: error.message,
                stack: process.env.NODE_ENV !== "production" ? error.stack : undefined,
            });
            return;
        }
        throw error;
    }
}
async function getQueryLogsHandler(req, res) {
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
    const project = await prisma_1.default.project.findFirst({
        where: { id: BigInt(projectId), userId: req.user.userId },
    });
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const logs = await prisma_1.default.queryLog.findMany({
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
