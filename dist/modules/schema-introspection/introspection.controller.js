"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectProjectSchemaHandler = introspectProjectSchemaHandler;
exports.getProjectSchemaHandler = getProjectSchemaHandler;
const introspection_service_1 = require("./introspection.service");
const prisma_1 = __importDefault(require("../../config/prisma"));
const introspection_logger_1 = require("./introspection.logger");
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
        (0, introspection_logger_1.logIntrospectionError)("Introspection request failed", error, { projectId });
        if (error instanceof introspection_service_1.ProjectNotFoundError) {
            res.status(404).json((0, introspection_logger_1.buildIntrospectionErrorBody)(error, projectId));
            return;
        }
        res.status(500).json((0, introspection_logger_1.buildIntrospectionErrorBody)(error, projectId));
    }
}
async function getProjectSchemaHandler(req, res) {
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
    const project = await prisma_1.default.project.findFirst({
        where: { id: BigInt(projectId), userId: req.user.userId },
    });
    if (!project) {
        res.status(404).json({ error: "Project not found" });
        return;
    }
    const schemaTables = await prisma_1.default.schemaTable.findMany({
        where: { projectId: BigInt(projectId) },
        orderBy: { tableName: "asc" },
        include: {
            columns: {
                orderBy: { columnName: "asc" },
            },
        },
    });
    const tables = schemaTables.map(t => ({ tableName: t.tableName }));
    const columns = schemaTables.flatMap(t => t.columns.map(c => ({
        tableName: t.tableName,
        columnName: c.columnName,
        dataType: c.dataType,
        isNullable: c.isNullable,
    })));
    res.json({ tables, columns });
}
