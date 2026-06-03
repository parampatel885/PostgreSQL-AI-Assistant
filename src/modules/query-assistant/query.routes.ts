import { Router } from "express";
import { queryAssistantHandler, getQueryLogsHandler } from "./query.controller";
import { authenticate } from "../../middleware/authenticate";

export const queryAssistantRouter = Router();

queryAssistantRouter.post("/", (req, res, next) => {
  queryAssistantHandler(req, res).catch(next);
});

queryAssistantRouter.get("/:projectId/logs", (req, res, next) => {
  authenticate(req, res, () => {
    getQueryLogsHandler(req, res).catch(next);
  });
});
