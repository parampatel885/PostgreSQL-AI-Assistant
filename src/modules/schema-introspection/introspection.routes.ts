import { Router } from "express";
import { introspectProjectSchemaHandler } from "./introspection.controller";

export const introspectionRouter = Router();

introspectionRouter.post("/:projectId/introspect", (req, res, next) => {
  introspectProjectSchemaHandler(req, res).catch(next);
});
