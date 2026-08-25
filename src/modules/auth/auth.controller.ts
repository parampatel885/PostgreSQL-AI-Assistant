import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createUser, findUserByEmail } from "./auth.service";
import prisma from "../../config/prisma";

const SALT_ROUNDS = 12;
const TOKEN_COOKIE_NAME = "token";
const TOKEN_EXPIRES_IN = "7d";

function buildAuthCookieOptions() {
  const isProd = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
  };
}

function getJwtSecret(): string | null {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || jwtSecret.trim().length === 0) {
    return null;
  }

  return jwtSecret;
}

export async function registerHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ error: "Field 'email' is required and must be a non-empty string." });
    return;
  }

  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Field 'password' is required and must be a non-empty string." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await findUserByEmail(normalizedEmail);
  if (existingUser) {
    res.status(409).json({ error: "A user with this email already exists." });
    return;
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET is missing." });
    return;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await createUser(normalizedEmail, passwordHash);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      expiresAt,
    },
  });

  const token = jwt.sign({ userId: user.id, sessionId: session.id }, jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });

  res.cookie(TOKEN_COOKIE_NAME, token, {
    ...buildAuthCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.status(201).json({ id: user.id, email: user.email, createdAt: user.createdAt });
}

export async function loginHandler(req: Request, res: Response): Promise<void> {
  const { email, password } = req.body as { email?: unknown; password?: unknown };

  if (typeof email !== "string" || email.trim().length === 0) {
    res.status(400).json({ error: "Field 'email' is required and must be a non-empty string." });
    return;
  }

  if (typeof password !== "string" || password.length === 0) {
    res.status(400).json({ error: "Field 'password' is required and must be a non-empty string." });
    return;
  }

  const jwtSecret = getJwtSecret();
  if (!jwtSecret) {
    res.status(500).json({ error: "Server misconfiguration: JWT_SECRET is missing." });
    return;
  }

  const user = await findUserByEmail(email.trim().toLowerCase());
  if (!user) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
  if (!isPasswordValid) {
    res.status(401).json({ error: "Invalid email or password." });
    return;
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  const session = await prisma.userSession.create({
    data: {
      userId: user.id,
      expiresAt,
    },
  });

  const token = jwt.sign({ userId: user.id, sessionId: session.id }, jwtSecret, { expiresIn: TOKEN_EXPIRES_IN });

  res.cookie(TOKEN_COOKIE_NAME, token, {
    ...buildAuthCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ id: user.id, email: user.email });
}

export async function logoutHandler(req: Request, res: Response): Promise<void> {
  const sessionId = req.user?.sessionId;
  if (sessionId) {
    await prisma.userSession.delete({
      where: { id: sessionId },
    }).catch(() => {});
  }

  res.clearCookie(TOKEN_COOKIE_NAME, buildAuthCookieOptions());
  res.status(204).send();
}

export async function getMeHandler(req: Request, res: Response) {
  if (!req.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  res.json({ id: req.user.userId, email: req.user.email });
}

export async function getSessionsHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const sessions = await prisma.userSession.findMany({
    where: { userId: req.user.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      expiresAt: true,
    },
  });

  res.json(sessions);
}

export async function revokeSessionHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const { id } = req.params;
  if (!id) {
    res.status(400).json({ error: "Session ID parameter is required." });
    return;
  }

  const session = await prisma.userSession.findUnique({
    where: { id },
  });

  if (!session || session.userId !== req.user.userId) {
    res.status(404).json({ error: "Session not found." });
    return;
  }

  await prisma.userSession.delete({
    where: { id },
  });

  if (id === req.user.sessionId) {
    res.clearCookie(TOKEN_COOKIE_NAME, buildAuthCookieOptions());
  }

  res.status(204).send();
}

export async function logoutAllHandler(req: Request, res: Response): Promise<void> {
  if (!req.user?.userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  await prisma.userSession.deleteMany({
    where: { userId: req.user.userId },
  });

  res.clearCookie(TOKEN_COOKIE_NAME, buildAuthCookieOptions());
  res.status(204).send();
}
