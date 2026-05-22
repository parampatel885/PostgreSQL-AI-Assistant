import { Router } from "express";
import { loginHandler, logoutHandler, registerHandler, getMeHandler } from "./auth.controller";
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