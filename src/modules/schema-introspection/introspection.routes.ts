import { Router } from "express";
import { introspectProjectSchemaHandler, getProjectSchemaHandler } from "./introspection.controller";
import { authenticate } from "../../middleware/authenticate";

export const introspectionRouter = Router();

introspectionRouter.post("/:projectId/introspect", (req, res, next) => {
  introspectProjectSchemaHandler(req, res).catch(next);
});

introspectionRouter.get("/:projectId/schema", (req, res, next) => {
  authenticate(req, res, () => {
    getProjectSchemaHandler(req, res).catch(next);
  });
});
