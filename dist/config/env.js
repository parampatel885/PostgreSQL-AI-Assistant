"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const requiredEnvVars = [
    "DATABASE_URL",
    "ENCRYPTION_KEY",
    "FRONTEND_URL",
    "OPENROUTER_API_KEY",
];
for (const key of requiredEnvVars) {
    if (!process.env[key]) {
        throw new Error(`Missing required environment variable: ${key}`);
    }
}
const encryptionKey = process.env.ENCRYPTION_KEY;
if (encryptionKey.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be exactly 32 characters.");
}
exports.env = {
    port: Number(process.env.PORT ?? 4000),
    databaseUrl: process.env.DATABASE_URL,
    openRouterApiKey: process.env.OPENROUTER_API_KEY,
    openRouterBaseUrl: process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
    openRouterModel: process.env.OPENROUTER_MODEL || "google/gemma-2-9b-it:free",
    embeddingModel: process.env.EMBEDDING_MODEL || "openai/text-embedding-3-small",
};
