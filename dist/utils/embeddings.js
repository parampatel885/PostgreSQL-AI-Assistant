"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEmbedding = generateEmbedding;
const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;
const OPENROUTER_EMBEDDINGS_URL = "https://openrouter.ai/api/v1/embeddings";
async function generateEmbedding(text) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey || apiKey.trim().length === 0) {
        throw new Error("OPENROUTER_API_KEY is required for embeddings.");
    }
    const response = await fetch(OPENROUTER_EMBEDDINGS_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000",
            "X-Title": "PostgreSQL Query Assistant",
        },
        body: JSON.stringify({
            model: EMBEDDING_MODEL,
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
