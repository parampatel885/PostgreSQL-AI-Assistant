"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAssistantRouter = void 0;
const express_1 = require("express");
const query_controller_1 = require("./query.controller");
const authenticate_1 = require("../../middleware/authenticate");
exports.queryAssistantRouter = (0, express_1.Router)();
exports.queryAssistantRouter.post("/", (req, res, next) => {
    (0, query_controller_1.queryAssistantHandler)(req, res).catch(next);
});
exports.queryAssistantRouter.get("/:projectId/logs", (req, res, next) => {
    (0, authenticate_1.authenticate)(req, res, () => {
        (0, query_controller_1.getQueryLogsHandler)(req, res).catch(next);
    });
});
