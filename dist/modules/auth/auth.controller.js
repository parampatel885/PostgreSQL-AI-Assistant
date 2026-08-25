"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.loginHandler = loginHandler;
exports.logoutHandler = logoutHandler;
exports.getMeHandler = getMeHandler;
exports.getSessionsHandler = getSessionsHandler;
exports.revokeSessionHandler = revokeSessionHandler;
exports.logoutAllHandler = logoutAllHandler;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_1 = require("./auth.service");
const prisma_1 = __importDefault(require("../../config/prisma"));
const SALT_ROUNDS = 12;
const TOKEN_COOKIE_NAME = "token";
const TOKEN_EXPIRES_IN = "7d";
function buildAuthCookieOptions() {
    const isProd = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
    };
}
function getJwtSecret() {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret || jwtSecret.trim().length === 0) {
        return null;
    }
    return jwtSecret;
}
async function registerHandler(req, res) {
    const { email, password } = req.body;
    if (typeof email !== "string" || email.trim().length === 0) {
        res.status(400).json({ error: "Field 'email' is required and must be a non-empty string." });
        return;
    }
    if (typeof password !== "string" || password.length === 0) {
        res.status(400).json({ error: "Field 'password' is required and must be a non-empty string." });
        return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const existingUser = await (0, auth_service_1.findUserByEmail)(normalizedEmail);
    if (existingUser) {
        res.status(409).json({ error: "A user with this email already exists." });
        return;
    }
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
        res.status(500).json({ error: "Server misconfiguration: JWT_SECRET is missing." });
        return;
    }
    const passwordHash = await bcryptjs_1.default.hash(password, SALT_ROUNDS);
    const user = await (0, auth_service_1.createUser)(normalizedEmail, passwordHash);
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const session = await prisma_1.default.userSession.create({
        data: {
            userId: user.id,
            expiresAt,
        },
    });
    const token = jsonwebtoken_1.default.sign({ userId: user.id, sessionId: session.id }, jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });
    res.cookie(TOKEN_COOKIE_NAME, token, {
        ...buildAuthCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
}
async function loginHandler(req, res) {
    const { email, password } = req.body;
    if (typeof email !== "string" || email.trim().length === 0) {
        res.status(400).json({ error: "Field 'email' is required and must be a non-empty string." });
        return;
    }
    if (typeof password !== "string" || password.length === 0) {
        res.status(400).json({ error: "Field 'password' is required and must be a non-empty string." });
        return;
    }
    const jwtSecret = getJwtSecret();
    if (!jwtSecret) {
        res.status(500).json({ error: "Server misconfiguration: JWT_SECRET is missing." });
        return;
    }
    const user = await (0, auth_service_1.findUserByEmail)(email.trim().toLowerCase());
    if (!user) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
    }
    const isPasswordValid = await bcryptjs_1.default.compare(password, user.passwordHash);
    if (!isPasswordValid) {
        res.status(401).json({ error: "Invalid email or password." });
        return;
    }
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);
    const session = await prisma_1.default.userSession.create({
        data: {
            userId: user.id,
            expiresAt,
        },
    });
    const token = jsonwebtoken_1.default.sign({ userId: user.id, sessionId: session.id }, jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });
    res.cookie(TOKEN_COOKIE_NAME, token, {
        ...buildAuthCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ id: user.id, email: user.email });
}
async function logoutHandler(req, res) {
    const sessionId = req.user?.sessionId;
    if (sessionId) {
        await prisma_1.default.userSession.delete({
            where: { id: sessionId },
        }).catch(() => { });
    }
    res.clearCookie(TOKEN_COOKIE_NAME, buildAuthCookieOptions());
    res.status(204).send();
}
async function getMeHandler(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ id: req.user.userId, email: req.user.email });
}
async function getSessionsHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const sessions = await prisma_1.default.userSession.findMany({
        where: { userId: req.user.userId },
        orderBy: { createdAt: "desc" },
        select: {
            id: true,
            createdAt: true,
            expiresAt: true,
        },
    });
    res.json(sessions);
}
async function revokeSessionHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    const { id } = req.params;
    if (!id) {
        res.status(400).json({ error: "Session ID parameter is required." });
        return;
    }
    const session = await prisma_1.default.userSession.findUnique({
        where: { id },
    });
    if (!session || session.userId !== req.user.userId) {
        res.status(404).json({ error: "Session not found." });
        return;
    }
    await prisma_1.default.userSession.delete({
        where: { id },
    });
    if (id === req.user.sessionId) {
        res.clearCookie(TOKEN_COOKIE_NAME, buildAuthCookieOptions());
    }
    res.status(204).send();
}
async function logoutAllHandler(req, res) {
    if (!req.user?.userId) {
        res.status(401).json({ error: "Unauthorized" });
        return;
    }
    await prisma_1.default.userSession.deleteMany({
        where: { userId: req.user.userId },
    });
    res.clearCookie(TOKEN_COOKIE_NAME, buildAuthCookieOptions());
    res.status(204).send();
}
