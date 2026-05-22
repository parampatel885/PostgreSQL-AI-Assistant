"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectNotFoundError = void 0;
exports.runQuestionQuery = runQuestionQuery;
const prisma_1 = __importDefault(require("../../config/prisma"));
const crypto_1 = require("../../utils/crypto");
const prompt_builder_1 = require("./prompt-builder");
const sql_runner_1 = require("./sql-runner");
const sql_validator_1 = require("./sql-validator");
const openai_1 = __importDefault(require("openai"));
class ProjectNotFoundError extends Error {
    constructor(projectId) {
        super(`Project with id '${projectId}' not found.`);
        this.name = "ProjectNotFoundError";
    }
}
exports.ProjectNotFoundError = ProjectNotFoundError;
async function runQuestionQuery(projectId, question) {
    const project = await prisma_1.default.project.findUnique({
        where: { id: BigInt(projectId) },
        select: { id: true, databaseUrl: true },
    });
    if (!project) {
        throw new ProjectNotFoundError(projectId);
    }
    const relationshipRows = await prisma_1.default.schemaRelationship.findMany({
        where: { projectId: BigInt(projectId) },
        orderBy: [
            { fromTable: "asc" },
            { fromColumn: "asc" },
            { toTable: "asc" },
            { toColumn: "asc" },
        ],
    });
    const relationships = relationshipRows.map((row) => ({
        fromTable: row.fromTable,
        fromColumn: row.fromColumn,
        toTable: row.toTable,
        toColumn: row.toColumn,
    }));
    const prompt = await (0, prompt_builder_1.buildQueryPromptAsync)(BigInt(projectId), question, relationships);
    const sql = await generateSqlFromPrompt(prompt);
    (0, sql_validator_1.validateSql)(sql);
    const safeSql = enforceLimit(sql);
    const rows = await (0, sql_runner_1.runSelectSql)((0, crypto_1.decrypt)(project.databaseUrl), safeSql);
    return { sql: safeSql, rows };
}
async function generateSqlFromPrompt(prompt) {
    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
        return "SELECT 1 AS placeholder_result";
    }
    const client = new openai_1.default({
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
function enforceLimit(sql) {
    const cleanedSql = sql.trim().replace(/;$/, "");
    if (/limit\s+\d+/i.test(cleanedSql)) {
        return cleanedSql + ";";
    }
    return cleanedSql + " LIMIT 50;";
}
