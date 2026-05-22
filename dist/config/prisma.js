"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testPlatformDbConnection = testPlatformDbConnection;
const client_1 = require("@prisma/client");
const globalForPrisma = globalThis;
const prisma = globalForPrisma.prisma ?? new client_1.PrismaClient();
if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
async function testPlatformDbConnection() {
    await prisma.$queryRaw `SELECT 1`;
}
exports.default = prisma;
