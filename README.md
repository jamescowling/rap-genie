# rap-genie

- Load the databae from `load.py`.
- Extract verses and generate embeddings with `processSongBatch({limit: 10, recurse: true, minViews: 500000n})`.
- Run Convex sync with `npx convex dev`.
- Host website with `npx vite`.

## TODO

- change mascot to something more cartoony
- only index songs that are popular, or rank them by popularity
- link display to genius listing
