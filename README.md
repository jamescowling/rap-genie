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
Convex vector search finds matching verses using `openai/text-embedding-3-small`.
There is no keyword search or reranking step.

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

## Upgrading existing embeddings

The gateway now uses `openai/text-embedding-3-small` (1,536 dimensions) for both
queries and verses. Ada vectors are incompatible even though their dimensions
match. Existing rows lack `embeddingModel`; search deliberately excludes them.
New ingestion writes the model tag automatically.

After reviewing the model and cost, deploy and run one small migration batch:

```sh
npx convex run songs:reembedVerses '{}'
```

Then, to process the remaining legacy verses in batches of 128:

```sh
npx convex run songs:reembedVerses '{"recursive":true}'
```

These commands target the configured development deployment. Add `--prod` only
when intentionally migrating production. The job replaces each existing vector
and tags it atomically; it preserves verse text, IDs, and song references. It
stops on failure. Rerunning skips completed rows; run only one chain at a time.
`songs:legacyVerseBatch` returns an empty array when the migration is complete.
Take a Convex export before migrating if rollback to Ada is needed.

Plan the cutover: search initially returns no results until the first batch is
migrated, and coverage grows until completion. Do not direct users to the upgraded
deployment until the job finishes. Model calls and Convex operations incur usage;
deploying this code does not start the job automatically.

## Checks

Run `npm test`, `npm run build`, and `npx tsc --noEmit -p convex/tsconfig.json`.
