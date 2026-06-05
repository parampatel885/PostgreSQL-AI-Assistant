"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectNotFoundError = void 0;
exports.introspectAndSaveSchema = introspectAndSaveSchema;
const prisma_1 = __importDefault(require("../../config/prisma"));
const embedding_service_1 = require("./embedding.service");
const postgres_introspector_1 = require("./postgres-introspector");
const crypto_1 = require("../../utils/crypto");
const introspection_logger_1 = require("./introspection.logger");
class ProjectNotFoundError extends Error {
    constructor(projectId) {
        super(`Project with id '${projectId}' not found.`);
        this.name = "ProjectNotFoundError";
    }
}
exports.ProjectNotFoundError = ProjectNotFoundError;
function groupColumnsByTable(columns) {
    const map = new Map();
    for (const column of columns) {
        const existing = map.get(column.tableName) ?? [];
        existing.push(column);
        map.set(column.tableName, existing);
    }
    return map;
}
async function introspectAndSaveSchema(projectId) {
    (0, introspection_logger_1.logIntrospectionStep)("Starting introspection for project", { projectId });
    const normalizedProjectId = BigInt(projectId);
    let project = null;
    try {
        (0, introspection_logger_1.logIntrospectionStep)("Reading project from platform database", { projectId });
        project = await prisma_1.default.project.findUnique({
            where: {
                id: normalizedProjectId,
            },
            select: {
                id: true,
                databaseUrl: true,
            },
        });
        (0, introspection_logger_1.logIntrospectionStep)("Reading project from platform database completed", {
            projectId,
            found: Boolean(project),
        });
    }
    catch (error) {
        (0, introspection_logger_1.logIntrospectionError)("Reading project from platform database", error, { projectId });
        throw error;
    }
    if (!project) {
        const notFoundError = new ProjectNotFoundError(projectId);
        (0, introspection_logger_1.logIntrospectionError)("Project not found in platform database", notFoundError, { projectId });
        throw notFoundError;
    }
    let decryptedUrl;
    try {
        decryptedUrl = (0, crypto_1.decrypt)(project.databaseUrl);
    }
    catch (error) {
        (0, introspection_logger_1.logIntrospectionError)("Decrypting project database URL", error, { projectId });
        throw error;
    }
    let introspection;
    try {
        introspection = await (0, postgres_introspector_1.introspectPostgresSchema)(decryptedUrl);
    }
    catch (error) {
        if ((0, introspection_logger_1.isPostgresConnectionError)(error)) {
            (0, introspection_logger_1.logPostgresConnectionError)("Introspecting target PostgreSQL database", error, decryptedUrl, {
                projectId,
            });
        }
        else {
            (0, introspection_logger_1.logIntrospectionError)("Introspecting target PostgreSQL database", error, { projectId });
        }
        throw error;
    }
    const columnsByTable = groupColumnsByTable(introspection.columns);
    try {
        (0, introspection_logger_1.logIntrospectionStep)("Writing schema metadata", {
            projectId,
            tableCount: introspection.tables.length,
            columnCount: introspection.columns.length,
            relationshipCount: introspection.relationships.length,
        });
        await prisma_1.default.$transaction(async (tx) => {
            await tx.schemaTable.deleteMany({
                where: {
                    projectId: normalizedProjectId,
                },
            });
            await tx.schemaRelationship.deleteMany({
                where: {
                    projectId: normalizedProjectId,
                },
            });
            for (const table of introspection.tables) {
                const insertedTable = await tx.schemaTable.create({
                    data: {
                        projectId: normalizedProjectId,
                        tableName: table.tableName,
                    },
                    select: {
                        id: true,
                    },
                });
                const tableColumns = columnsByTable.get(table.tableName) ?? [];
                if (tableColumns.length > 0) {
                    await tx.schemaColumn.createMany({
                        data: tableColumns.map((column) => ({
                            tableId: insertedTable.id,
                            columnName: column.columnName,
                            dataType: column.dataType,
                            isNullable: column.isNullable,
                        })),
                    });
                }
            }
            if (introspection.relationships.length > 0) {
                await tx.schemaRelationship.createMany({
                    data: introspection.relationships.map((relationship) => ({
                        projectId: normalizedProjectId,
                        fromTable: relationship.fromTable,
                        fromColumn: relationship.fromColumn,
                        toTable: relationship.toTable,
                        toColumn: relationship.toColumn,
                    })),
                });
            }
        });
        (0, introspection_logger_1.logIntrospectionStep)("Writing schema metadata completed", { projectId });
    }
    catch (error) {
        (0, introspection_logger_1.logIntrospectionError)("Writing schema metadata", error, { projectId });
        throw error;
    }
    try {
        (0, introspection_logger_1.logIntrospectionStep)("Generating table embeddings", { projectId });
        const tablesWithColumns = await prisma_1.default.schemaTable.findMany({
            where: { projectId: normalizedProjectId },
            select: {
                id: true,
                tableName: true,
                columns: {
                    orderBy: { columnName: "asc" },
                    select: { columnName: true, dataType: true },
                },
            },
            orderBy: { tableName: "asc" },
        });
        for (const table of tablesWithColumns) {
            await (0, embedding_service_1.generateAndStoreTableEmbedding)(table.id, table.tableName, table.columns.map((column) => ({
                columnName: column.columnName,
                dataType: column.dataType,
            })));
        }
        (0, introspection_logger_1.logIntrospectionStep)("Generating table embeddings completed", {
            projectId,
            tableCount: tablesWithColumns.length,
        });
    }
    catch (error) {
        (0, introspection_logger_1.logIntrospectionError)("Generating table embeddings", error, { projectId });
        throw error;
    }
    (0, introspection_logger_1.logIntrospectionStep)("Introspection completed", { projectId });
    return {
        tables: introspection.tables.map((table) => ({
            tableName: table.tableName,
        })),
        columns: introspection.columns.map((column) => ({
            tableName: column.tableName,
            columnName: column.columnName,
            dataType: column.dataType,
            isNullable: column.isNullable,
        })),
        relationships: introspection.relationships.map((relationship) => ({
            fromTable: relationship.fromTable,
            fromColumn: relationship.fromColumn,
            toTable: relationship.toTable,
            toColumn: relationship.toColumn,
        })),
    };
}
