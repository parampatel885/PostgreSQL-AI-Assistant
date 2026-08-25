import { Router } from "express";
import {
  loginHandler,
  logoutHandler,
  registerHandler,
  getMeHandler,
  getSessionsHandler,
  revokeSessionHandler,
  logoutAllHandler,
} from "./auth.controller";
import { authenticate } from "../../middleware/authenticate";

export const authRouter = Router();

authRouter.post("/register", (req, res, next) => {
  registerHandler(req, res).catch(next);
});

authRouter.post("/login", (req, res, next) => {
  loginHandler(req, res).catch(next);
});

authRouter.post("/logout", (req, res, next) => {
  logoutHandler(req, res).catch(next);
});

authRouter.get("/me", authenticate, (req, res, next) => {
  getMeHandler(req, res).catch(next);
});

authRouter.get("/sessions", authenticate, (req, res, next) => {
  getSessionsHandler(req, res).catch(next);
});

authRouter.post("/sessions/:id/revoke", authenticate, (req, res, next) => {
  revokeSessionHandler(req, res).catch(next);
});

authRouter.post("/logout-all", authenticate, (req, res, next) => {
  logoutAllHandler(req, res).catch(next);
});