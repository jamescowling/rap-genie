// Utilities for fetching embeddings through the Convex AI gateway.
//
// The gateway authenticates with the deployment's own service token, so no
// OPENAI_API_KEY is needed. Same model as before (text-embedding-ada-002,
// 1536 dimensions), so every stored vector stays valid.

import { embedMany } from "ai";
import { convexGateway } from "@convex-dev/ai-sdk-provider";

// Fetch a batch of embeddings.
export async function fetchEmbeddingBatch(inputs: string[]) {
  const startTime = Date.now();
  const { embeddings } = await embedMany({
    model: convexGateway.embeddingModel("openai/text-embedding-ada-002"),
    values: inputs,
  });
  console.log(
    `Gateway fetch of ${inputs.length} embeddings took ${
      Date.now() - startTime
    } ms`
  );
  return embeddings;
}

export async function fetchEmbedding(input: string) {
  return (await fetchEmbeddingBatch([input]))[0];
}
