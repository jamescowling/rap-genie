// Utilities for talking to OpenAI.

// Fetch a batch of embeddings from OpenAI.
export async function fetchEmbeddingBatch(text: string[]) {
  const result = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.OPENAI_API_KEY,
    },

    body: JSON.stringify({
      model: "text-embedding-ada-002",
      input: text,
    }),
  });
  const jsonresults = await result.json();
  const allembeddings = jsonresults.data as {
    embedding: number[];
    index: number;
  }[];
  allembeddings.sort((a, b) => b.index - a.index);
  return allembeddings.map(({ embedding }) => embedding);
}

export async function fetchEmbedding(text: string) {
  return (await fetchEmbeddingBatch([text]))[0];
}
