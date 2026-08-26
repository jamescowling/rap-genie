// Utilities for fetching embeddings through the Convex AI gateway.
//
// The gateway authenticates with the deployment's own service token, so no
// OPENAI_API_KEY is needed. Same model as before (text-embedding-ada-002,
// 1536 dimensions), so every stored vector stays valid.

import { getServiceToken } from "convex/server";

const GATEWAY_HOST =
  process.env.CONVEX_INTERNAL_AI_GATEWAY_HOST || "https://ai-gateway.convex.dev";

// Fetch a batch of embeddings.
export async function fetchEmbeddingBatch(inputs: string[]) {
  const startTime = Date.now();
  const token = await getServiceToken("ai-gateway");
  const result = await fetch(`${GATEWAY_HOST}/v1/embeddings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + token,
    },

    body: JSON.stringify({
      model: "openai/text-embedding-ada-002",
      input: inputs,
    }),
  });
  if (!result.ok) {
    throw new Error(
      `Embedding fetch failed with ${result.status}: ${await result.text()}`,
    );
  }
  const jsonresults = await result.json();
  console.log(
    `Gateway fetch of ${inputs.length} embeddings took ${
      Date.now() - startTime
    } ms`
  );
  const allembeddings = jsonresults.data as {
    embedding: number[];
    index: number;
  }[];
  allembeddings.sort((a, b) => a.index - b.index);
  return allembeddings.map(({ embedding }) => embedding);
}

export async function fetchEmbedding(input: string) {
  return (await fetchEmbeddingBatch([input]))[0];
}
