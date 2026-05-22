"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.app = void 0;
require("./config/env");
const express_1 = __importDefault(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const project_routes_1 = require("./modules/projects/project.routes");
const introspection_routes_1 = require("./modules/schema-introspection/introspection.routes");
const query_routes_1 = require("./modules/query-assistant/query.routes");
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const auth_routes_1 = require("./modules/auth/auth.routes");
const globalLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
});
const authRegisterLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 60 * 1000,
    max: 5,
    standardHeaders: true,
    legacyHeaders: false,
});
const authLoginLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
});
const queryExecuteLimiter = (0, express_rate_limit_1.default)({
    windowMs: 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
});
exports.app = (0, express_1.default)();
exports.app.use((0, helmet_1.default)());
exports.app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL,
    credentials: true,
}));
exports.app.use(globalLimiter);
exports.app.use(express_1.default.json());
exports.app.use((0, cookie_parser_1.default)());
function applyAuthRouteLimits(req, res, next) {
    if (req.method !== "POST") {
        next();
        return;
    }
    if (req.path === "/register") {
        authRegisterLimiter(req, res, next);
        return;
    }
    if (req.path === "/login") {
        authLoginLimiter(req, res, next);
        return;
    }
    next();
}
function applyQueryExecuteLimit(req, res, next) {
    if (req.method === "POST" && req.path === "/execute") {
        queryExecuteLimiter(req, res, next);
        return;
    }
    next();
}
exports.app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
});
exports.app.use("/api/projects", project_routes_1.projectRouter);
exports.app.use("/api/projects", introspection_routes_1.introspectionRouter);
exports.app.use("/api/query", applyQueryExecuteLimit, query_routes_1.queryAssistantRouter);
exports.app.use("/api/auth", applyAuthRouteLimits, auth_routes_1.authRouter);
exports.app.use((err, _req, res, _next) => {
    console.error(err);
    res.status(500).json({ error: "Internal server error" });
});
