"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const TOKEN_COOKIE_NAME = "token";
function authenticate(req, res, next) {
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
        if (typeof decoded.userId !== "string" || decoded.userId.length === 0) {
            res.status(401).json({ error: "Unauthorized" });
            return;
        }
        req.user = { userId: decoded.userId };
        next();
    }
    catch {
        res.status(401).json({ error: "Unauthorized" });
    }
}
