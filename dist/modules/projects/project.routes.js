"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectRouter = void 0;
const express_1 = require("express");
const project_controller_1 = require("./project.controller");
const authenticate_1 = require("../../middleware/authenticate");
exports.projectRouter = (0, express_1.Router)();
exports.projectRouter.post("/", (req, res, next) => {
    (0, authenticate_1.authenticate)(req, res, () => {
        (0, project_controller_1.createProjectHandler)(req, res).catch(next);
    });
});
exports.projectRouter.get("/", (req, res, next) => {
    (0, authenticate_1.authenticate)(req, res, () => {
        (0, project_controller_1.getProjectsHandler)(req, res).catch(next);
    });
});
exports.projectRouter.get("/:id", (req, res, next) => {
    (0, authenticate_1.authenticate)(req, res, () => {
        (0, project_controller_1.getProjectByIdHandler)(req, res).catch(next);
    });
});
exports.projectRouter.patch("/:id", (req, res, next) => {
    (0, authenticate_1.authenticate)(req, res, () => {
        (0, project_controller_1.updateProjectHandler)(req, res).catch(next);
    });
});
exports.projectRouter.delete("/:id", (req, res, next) => {
    (0, authenticate_1.authenticate)(req, res, () => {
        (0, project_controller_1.deleteProjectHandler)(req, res).catch(next);
    });
});
