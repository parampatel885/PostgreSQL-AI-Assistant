"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createUser = createUser;
exports.findUserByEmail = findUserByEmail;
const prisma_1 = __importDefault(require("../../config/prisma"));
async function createUser(email, passwordHash) {
    const user = await prisma_1.default.user.create({
        data: {
            email,
            passwordHash,
        },
    });
    return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt.toISOString(),
    };
}
async function findUserByEmail(email) {
    const user = await prisma_1.default.user.findUnique({
        where: {
            email,
        },
    });
    if (!user) {
        return null;
    }
    return {
        id: user.id,
        email: user.email,
        passwordHash: user.passwordHash,
        createdAt: user.createdAt.toISOString(),
    };
}
