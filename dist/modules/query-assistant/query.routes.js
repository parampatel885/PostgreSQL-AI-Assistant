"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.queryAssistantRouter = void 0;
const express_1 = require("express");
const query_controller_1 = require("./query.controller");
exports.queryAssistantRouter = (0, express_1.Router)();
exports.queryAssistantRouter.post("/query", (req, res, next) => {
    (0, query_controller_1.queryAssistantHandler)(req, res).catch(next);
});
