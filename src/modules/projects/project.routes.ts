import { Router } from "express";
import { createProjectHandler } from "./project.controller";
import { authenticate } from "../../middleware/authenticate";

export const projectRouter = Router();

projectRouter.post("/", (req, res, next) => {
  authenticate(req, res, () => {
    createProjectHandler(req, res).catch(next);
  });
});
