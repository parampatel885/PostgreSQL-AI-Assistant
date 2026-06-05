"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
exports.getProjectsByUserId = getProjectsByUserId;
exports.getProjectById = getProjectById;
exports.updateProject = updateProject;
exports.deleteProject = deleteProject;
const prisma_1 = __importDefault(require("../../config/prisma"));
const crypto_1 = require("../../utils/crypto");
async function createProject(input) {
    const encryptedUrl = (0, crypto_1.encrypt)(input.databaseUrl);
    const project = await prisma_1.default.project.create({
        data: {
            name: input.name,
            databaseUrl: encryptedUrl,
            userId: input.userId,
        },
    });
    return {
        id: Number(project.id),
        name: project.name,
        databaseUrl: (0, crypto_1.decrypt)(project.databaseUrl),
        createdAt: project.createdAt.toISOString(),
    };
}
async function getProjectsByUserId(userId) {
    const projects = await prisma_1.default.project.findMany({
        where: { userId },
        orderBy: { createdAt: "desc" },
        include: {
            _count: {
                select: { schemaTables: true },
            },
        },
    });
    return projects.map((project) => ({
        id: Number(project.id),
        name: project.name,
        databaseUrl: (0, crypto_1.decrypt)(project.databaseUrl),
        createdAt: project.createdAt.toISOString(),
        tableCount: project._count.schemaTables,
    }));
}
async function getProjectById(id, userId) {
    const project = await prisma_1.default.project.findFirst({
        where: {
            id: BigInt(id),
            userId,
        },
    });
    if (!project)
        return null;
    return {
        id: Number(project.id),
        name: project.name,
        databaseUrl: (0, crypto_1.decrypt)(project.databaseUrl),
        createdAt: project.createdAt.toISOString(),
    };
}
async function updateProject(id, userId, input) {
    const existing = await prisma_1.default.project.findFirst({
        where: {
            id: BigInt(id),
            userId,
        },
    });
    if (!existing) {
        return null;
    }
    const project = await prisma_1.default.project.update({
        where: { id: BigInt(id) },
        data: {
            ...(input.name !== undefined ? { name: input.name } : {}),
            ...(input.databaseUrl !== undefined
                ? { databaseUrl: (0, crypto_1.encrypt)(input.databaseUrl) }
                : {}),
        },
    });
    return {
        id: Number(project.id),
        name: project.name,
        databaseUrl: (0, crypto_1.decrypt)(project.databaseUrl),
        createdAt: project.createdAt.toISOString(),
    };
}
async function deleteProject(id, userId) {
    const existing = await prisma_1.default.project.findFirst({
        where: {
            id: BigInt(id),
            userId,
        },
    });
    if (!existing) {
        return false;
    }
    await prisma_1.default.project.delete({
        where: { id: BigInt(id) },
    });
    return true;
}
