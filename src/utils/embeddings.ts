import { env } from "../config/env";

const EMBEDDING_DIMENSIONS = 1536;

interface OpenRouterEmbeddingResponse {
  data?: Array<{ embedding?: number[] }>;
}

export async function generateEmbedding(text: string): Promise<number[]> {
  if (!env.openRouterApiKey || env.openRouterApiKey.trim().length === 0) {
    throw new Error("OPENROUTER_API_KEY is required for embeddings.");
  }

  const response = await fetch(`${env.openRouterBaseUrl}/embeddings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.openRouterApiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "http://localhost:3000",
      "X-Title": "PostgreSQL Query Assistant",
    },
    body: JSON.stringify({
      model: env.embeddingModel,
      input: text,
      dimensions: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter embeddings failed (${response.status}): ${body}`);
  }

  const json = (await response.json()) as OpenRouterEmbeddingResponse;
  const embedding = json.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Expected embedding length ${EMBEDDING_DIMENSIONS}, received ${embedding?.length ?? "none"}.`
    );
  }

  return embedding;
}
