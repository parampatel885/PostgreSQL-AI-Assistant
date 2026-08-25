"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const prisma_1 = __importDefault(require("../config/prisma"));
const TOKEN_COOKIE_NAME = "token";
async function authenticate(req, res, next) {
    const token = req.cookies?.[TOKEN_COOKIE_NAME];
    if (!token) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length === 0) {
        res.status(500).json({ error: "Server misconfiguration: JWT_SECRET is missing." });
        return;
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        if (typeof decoded.userId !== "string" ||
            decoded.userId.length === 0 ||
            typeof decoded.sessionId !== "string" ||
            decoded.sessionId.length === 0) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        // Verify session exists and is not expired
        const session = await prisma_1.default.userSession.findUnique({
            where: { id: decoded.sessionId },
            include: {
                user: {
                    select: { email: true },
                },
            },
        });
        if (!session || session.expiresAt < new Date()) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        req.user = {
            userId: decoded.userId,
            sessionId: decoded.sessionId,
            email: session.user.email,
        };
        next();
    }
    catch {
        res.status(401).json({ error: "Unauthorized" });
    }
}
