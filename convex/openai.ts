import { embedMany } from "ai";
import { convexGateway } from "@convex-dev/ai-sdk-provider";

export const EMBEDDING_MODEL = "openai/text-embedding-3-small";

// Fetch a batch of embeddings.
export async function fetchEmbeddingBatch(inputs: string[]) {
  if (inputs.length === 0) return [];
  const startTime = Date.now();
  const { embeddings } = await embedMany({
    model: convexGateway.embeddingModel(EMBEDDING_MODEL),
    values: inputs,
    abortSignal: AbortSignal.timeout(15000),
    maxRetries: 1,
  });
  if (
    embeddings.length !== inputs.length ||
    embeddings.some(
      (vector) =>
        vector.length !== 1536 ||
        vector.some((value) => !Number.isFinite(value)),
    )
  ) {
    throw new Error("Invalid embedding response");
  }
  console.log(
    `Gateway fetch of ${inputs.length} embeddings took ${
      Date.now() - startTime
    } ms`,
  );
  return embeddings;
}

export async function fetchEmbedding(input: string) {
  return (await fetchEmbeddingBatch([input]))[0];
}
