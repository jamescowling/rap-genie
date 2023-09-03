// Utilities for talking to OpenAI.

// Fetch a batch of embeddings from OpenAI.
export async function fetchEmbeddingBatch(inputs: string[]) {
  const startTime = Date.now();
  const result = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    },

    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: inputs,
    }),
  });
  const jsonresults = await result.json();
  console.log(
    `OpenAI fetch of ${inputs.length} embeddings took ${
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
