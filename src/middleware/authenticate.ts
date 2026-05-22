import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const TOKEN_COOKIE_NAME = "token";

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const token = req.cookies?.[TOKEN_COOKIE_NAME] as string | undefined;
  if (!token) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim().length === 0) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET is missing." });
    return;
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as { userId?: unknown };
    if (typeof decoded.userId !== "string" || decoded.userId.length === 0) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = { userId: decoded.userId };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
