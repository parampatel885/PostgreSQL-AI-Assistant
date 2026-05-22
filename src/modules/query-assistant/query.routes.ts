import { Router } from "express";
import { queryAssistantHandler } from "./query.controller";

export const queryAssistantRouter = Router();

queryAssistantRouter.post("/query", (req, res, next) => {
  queryAssistantHandler(req, res).catch(next);
});
