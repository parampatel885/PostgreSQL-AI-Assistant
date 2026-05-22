import prisma from "../../config/prisma";
import { decrypt } from "../../utils/crypto";
import { buildQueryPromptAsync, SchemaRelationship } from "./prompt-builder";
import { runSelectSql } from "./sql-runner";
import { validateSql } from "./sql-validator";
import OpenAI from "openai";

export interface QueryAssistantResult {
  sql: string;
  rows: unknown[];
}

export class ProjectNotFoundError extends Error {
  constructor(projectId: number) {
    super(`Project with id '${projectId}' not found.`);
    this.name = "ProjectNotFoundError";
  }
}

export async function runQuestionQuery(
  projectId: number,
  question: string
): Promise<QueryAssistantResult> {
  const project = await prisma.project.findUnique({
    where: { id: BigInt(projectId) },
    select: { id: true, databaseUrl: true },
  });

  if (!project) {
    throw new ProjectNotFoundError(projectId);
  }

  const relationshipRows = await prisma.schemaRelationship.findMany({
    where: { projectId: BigInt(projectId) },
    orderBy: [
      { fromTable: "asc" },
      { fromColumn: "asc" },
      { toTable: "asc" },
      { toColumn: "asc" },
    ],
  });

  const relationships: SchemaRelationship[] = relationshipRows.map((row) => ({
    fromTable: row.fromTable,
    fromColumn: row.fromColumn,
    toTable: row.toTable,
    toColumn: row.toColumn,
  }));

  const prompt = await buildQueryPromptAsync(BigInt(projectId), question, relationships);
  const sql = await generateSqlFromPrompt(prompt);

  validateSql(sql);

  const safeSql = enforceLimit(sql);

  const rows = await runSelectSql(decrypt(project.databaseUrl), safeSql);

  return { sql: safeSql, rows };
}

async function generateSqlFromPrompt(prompt: string): Promise<string> {
  const openRouterApiKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterApiKey) {
    return "SELECT 1 AS placeholder_result";
  }

  const client = new OpenAI({
    apiKey: openRouterApiKey,
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "PostgreSQL Query Assistant",
    },
  });

  const completion = await client.chat.completions.create({
    model: "openai/gpt-oss-120b:free",
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
    temperature: 0,
  });

  const content = completion.choices[0]?.message?.content;

  if (!content) {
    throw new Error("OpenRouter did not return any SQL.");
  }

  return content
    .replace(/```sql/g, "")
    .replace(/```/g, "")
    .trim();
}

function enforceLimit(sql: string): string {
  const cleanedSql = sql.trim().replace(/;$/, "");

  if (/limit\s+\d+/i.test(cleanedSql)) {
    return cleanedSql + ";";
  }

  return cleanedSql + " LIMIT 50;";
}
