import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import prisma from "../config/prisma";

const TOKEN_COOKIE_NAME = "token";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
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
    const decoded = jwt.verify(token, jwtSecret) as { userId?: unknown; sessionId?: unknown };
    if (
      typeof decoded.userId !== "string" ||
      decoded.userId.length === 0 ||
      typeof decoded.sessionId !== "string" ||
      decoded.sessionId.length === 0
    ) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Verify session exists and is not expired
    const session = await prisma.userSession.findUnique({
      where: { id: decoded.sessionId },
      include: {
        user: {
          select: { email: true },
        },
      },
    });

    if (!session || session.expiresAt < new Date()) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.user = {
      userId: decoded.userId,
      sessionId: decoded.sessionId,
      email: session.user.email,
    };
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}
