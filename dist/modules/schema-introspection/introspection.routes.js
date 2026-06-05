"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.introspectionRouter = void 0;
const express_1 = require("express");
const introspection_controller_1 = require("./introspection.controller");
const authenticate_1 = require("../../middleware/authenticate");
exports.introspectionRouter = (0, express_1.Router)();
exports.introspectionRouter.post("/:projectId/introspect", (req, res, next) => {
    (0, introspection_controller_1.introspectProjectSchemaHandler)(req, res).catch(next);
});
exports.introspectionRouter.get("/:projectId/schema", (req, res, next) => {
    (0, authenticate_1.authenticate)(req, res, () => {
        (0, introspection_controller_1.getProjectSchemaHandler)(req, res).catch(next);
    });
});
