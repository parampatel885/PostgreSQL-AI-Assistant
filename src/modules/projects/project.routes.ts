import { Router } from "express";
import { createProjectHandler,getProjectsHandler, getProjectByIdHandler } from "./project.controller";
import { authenticate } from "../../middleware/authenticate";


export const projectRouter = Router();

projectRouter.post("/", (req, res, next) => {
  authenticate(req, res, () => {
    createProjectHandler(req, res).catch(next);
  });
});

projectRouter.get("/", (req, res, next) => {
  authenticate(req, res, () => {
    getProjectsHandler(req, res).catch(next);
  });
});

projectRouter.get("/:id", (req, res, next) => {
  authenticate(req, res, () => {
    getProjectByIdHandler(req, res).catch(next);
  });
});

