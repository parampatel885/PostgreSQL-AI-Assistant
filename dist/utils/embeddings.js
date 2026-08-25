"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
const env_1 = require("../config/env");
const EMBEDDING_DIMENSIONS = 1536;
async function generateEmbedding(text) {
    if (!env_1.env.openRouterApiKey || env_1.env.openRouterApiKey.trim().length === 0) {
        throw new Error("OPENROUTER_API_KEY is required for embeddings.");
    }
    const response = await fetch(`${env_1.env.openRouterBaseUrl}/embeddings`, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${env_1.env.openRouterApiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "PostgreSQL Query Assistant",
        },
        body: JSON.stringify({
            model: env_1.env.embeddingModel,
            input: text,
            dimensions: EMBEDDING_DIMENSIONS,
        }),
    });
    if (!response.ok) {
        const body = await response.text();
        throw new Error(`OpenRouter embeddings failed (${response.status}): ${body}`);
    }
    const json = (await response.json());
    const embedding = json.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
        throw new Error(`Expected embedding length ${EMBEDDING_DIMENSIONS}, received ${embedding?.length ?? "none"}.`);
    }
    return embedding;
}
