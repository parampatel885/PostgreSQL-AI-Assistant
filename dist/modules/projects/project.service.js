"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createProject = createProject;
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
