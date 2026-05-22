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
    const normalizedProjectId = BigInt(projectId);
    const project = await prisma_1.default.project.findUnique({
        where: {
            id: normalizedProjectId,
        },
        select: {
            id: true,
            databaseUrl: true,
        },
    });
    if (!project) {
        throw new ProjectNotFoundError(projectId);
    }
    const introspection = await (0, postgres_introspector_1.introspectPostgresSchema)(project.databaseUrl);
    const columnsByTable = groupColumnsByTable(introspection.columns);
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
