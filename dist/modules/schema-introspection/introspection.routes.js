"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectionRouter = void 0;
const express_1 = require("express");
const introspection_controller_1 = require("./introspection.controller");
exports.introspectionRouter = (0, express_1.Router)();
exports.introspectionRouter.post("/:projectId/introspect", (req, res, next) => {
    (0, introspection_controller_1.introspectProjectSchemaHandler)(req, res).catch(next);
});
