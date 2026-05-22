"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authRouter = void 0;
const express_1 = require("express");
const auth_controller_1 = require("./auth.controller");
exports.authRouter = (0, express_1.Router)();
exports.authRouter.post("/register", (req, res, next) => {
    (0, auth_controller_1.registerHandler)(req, res).catch(next);
});
exports.authRouter.post("/login", (req, res, next) => {
    (0, auth_controller_1.loginHandler)(req, res).catch(next);
});
exports.authRouter.post("/logout", (req, res, next) => {
    (0, auth_controller_1.logoutHandler)(req, res).catch(next);
});
