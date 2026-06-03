import "./config/env";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { projectRouter } from "./modules/projects/project.routes";
import { introspectionRouter } from "./modules/schema-introspection/introspection.routes";
import { queryAssistantRouter } from "./modules/query-assistant/query.routes";
import cors from "cors";
import cookieParser from "cookie-parser";
import { authRouter } from "./modules/auth/auth.routes";
import prisma from "./config/prisma";

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

const authRegisterLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const queryExecuteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

export const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: false,
}));
app.use(
  cors({
    origin: process.env.FRONTEND_URL,
    credentials: true,
  })
);
app.use(globalLimiter);
app.use(express.json());
app.use(cookieParser());

function applyAuthRouteLimits(req: Request, res: Response, next: NextFunction): void {
  if (req.method !== "POST") {
    next();
    return;
  }
  if (req.path === "/register") {
    authRegisterLimiter(req, res, next);
    return;
  }
  if (req.path === "/login") {
    authLoginLimiter(req, res, next);
    return;
  }
  next();
}

function applyQueryExecuteLimit(req: Request, res: Response, next: NextFunction): void {
  if (req.method === "POST" && req.path === "/execute") {
    queryExecuteLimiter(req, res, next);
    return;
  }
  next();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.use("/api/projects", projectRouter);
app.use("/api/projects", introspectionRouter);
app.use("/api/query", applyQueryExecuteLimit, queryAssistantRouter);
app.use("/api/auth", applyAuthRouteLimits, authRouter);

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.get("/test-embeddings/:projectId", async (req, res) => {
  const question = req.query.question as string ?? "show me all orders";
  const projectId = BigInt(req.params.projectId);

  const embedding = await import("./utils/embeddings").then(m => m.generateEmbedding(question));
  const vectorLiteral = `[${embedding.join(",")}]`;

  const rows = await prisma.$queryRawUnsafe<Array<{ table_name: string; distance: number }>>(
    `SELECT table_name, embedding <=> $2::vector AS distance
     FROM schema_tables
     WHERE project_id = $1 AND embedding IS NOT NULL
     ORDER BY embedding <=> $2::vector
     LIMIT 10`,
    projectId,
    vectorLiteral,
    10
  );

  res.json({ question, tables: rows });
});