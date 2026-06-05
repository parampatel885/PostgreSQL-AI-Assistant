"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHandler = registerHandler;
exports.loginHandler = loginHandler;
exports.logoutHandler = logoutHandler;
exports.getMeHandler = getMeHandler;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const auth_service_1 = require("./auth.service");
const SALT_ROUNDS = 12;
const TOKEN_COOKIE_NAME = "token";
const TOKEN_EXPIRES_IN = "7d";
function buildAuthCookieOptions() {
    return {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "none",
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
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });
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
    const token = jsonwebtoken_1.default.sign({ userId: user.id }, jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });
    res.cookie(TOKEN_COOKIE_NAME, token, {
        ...buildAuthCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({ id: user.id, email: user.email });
}
async function logoutHandler(_req, res) {
    res.clearCookie(TOKEN_COOKIE_NAME, buildAuthCookieOptions());
    res.status(204).send();
}
async function getMeHandler(req, res) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    res.json({ id: req.user.userId, email: req.user.email });
}
