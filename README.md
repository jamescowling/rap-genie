# Rap Genie

Rap Genie is a semantic search engine for rap verses, built on [Convex vector
search](https://convex.dev). It's hosted at https://rapgenie.net.

Want to find a verse about `motorcycles`? Rap Genie has got your back:

> Ninja! (Ninja!) Kawasaki! (Kawasaki!)  
> Ducati! (Ducati!) My old Harley (My old Harley!)  
> Rock the party! (Rock the party)  
> Move your body! (Move your body)  
> Wassup? (Wassup?) Everybody! (Everybody!)

This would have been better if it mentioned Triumph but maybe I'm biased. Anyway
the word "motorcycle" doesn't show up in the verse but it's clearly about
motorcycles - Rap Genie still finds it.

Rap Genie uses the Convex AI gateway to generate an OpenAI embedding for each
verse and each search query, authenticated with the deployment's own service
token — no API key to set. The song/verse database is stored in Convex and
Convex vector search supplies semantic candidates and full-text search adds keyword
candidates. Rank fusion and optional gateway reranking select diverse results.

Convex is a serverless fullstack development platform that makes it easy to
build dynamic web apps, talk to third party APIs, and run background jobs. Feel
free to fork the repo to make changes, or build something else cool on Convex.

The app is seeded with the [Genius
dataset](https://www.kaggle.com/datasets/nikhilnayak123/5-million-song-lyrics-dataset)
from Kaggle. Despite storing millions of songs the Rap Genie workload fits
within the included resources on a Convex Pro account.

## Deployment instructions

### Hybrid search

Search combines up to 60 semantic and 40 keyword matches using reciprocal rank
fusion, then removes repeated songs and identical normalized lyric passages.
Existing Ada embeddings remain valid: no re-embedding or data migration is needed.
Deploying the schema builds the new `verses.by_text` full-text index over existing
verses; budget for index backfill time and additional search usage.

Optional reranking is disabled by default. Set `SEARCH_RERANK_ENABLED=true` in the
Convex deployment to evaluate gateway `openai/gpt-4o-mini` ranking of the first 30
candidates. Each passage is capped at 1,600 characters; the request has a four-second
timeout and no retries. Invalid output or gateway failure returns the fused order.
The model must return a complete permutation of candidate IDs, never lyric text.
Disable the flag to roll back reranking without rebuilding the index.

If either retrieval source fails, search uses the surviving source. Returned
`score` values are reciprocal-rank-fusion scores, not probabilities or the final
reranking scores. The UI intentionally no longer displays a match percentage.

Run `npm test`, `npm run build`, and `npx tsc --noEmit -p convex/tsconfig.json`.
Before enabling reranking in production, compare representative topic and fragment
queries with the flag on/off and record relevance, latency, and gateway spend.


- Get familiar with [the Convex platform](https://convex.dev/start).
- Run Convex function sync in the background with `npx convex dev`.
- Load the database via `load.py`.
- Extract verses and generate embeddings e.g., with
  `processSongBatch({limit: 20, recursive: true, minViews: 100000n})`.
- Run website with `npx vite`.
