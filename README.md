# Rap Genie

Rap Genie is a semantic search engine for rap verses, built on [Convex vector
search](https://convex.dev). It's hosted at https://rapgenie.net.

Want to find a verse about `TODO: search query`? Rap Genie has got your back:

> TODO: song lyrics here

Rap Genie uses OpenAI to generate an embedding for each verse and each search
query. The song/verse database is stored in Convex and Convex vector search is
used to obtain the embeddings that have the closest cosine similarity to a given
search query.

Convex is a serverless fullstack development platform that makes it easy to
build dynamic web apps, talk to third party APIs, and run background jobs. Feel
free to fork the repo to make changes, or build something else cool on Convex.

The app is seeded with the [Genius
dataset](https://www.kaggle.com/datasets/nikhilnayak123/5-million-song-lyrics-dataset)
from Kaggle. Despite storing millions of songs the Rap Genie workload fits
within the included resources on a Convex Pro account.

## Deployment instructions

- Get familiar with [the Convex platform](https://convex.dev/start).
- Run Convex function sync in the background with `npx convex dev`.
- Load the database via `load.py`.
- Extract verses and generate embeddings e.g., with
  `processSongBatch({limit: 20, recursive: true, minViews: 100000n})`.
- Run website with `npx vite`.
