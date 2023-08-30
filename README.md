# Rap Genie

Rap Genie is a semantic search engine for rap verses, hosted at https://rapgenie.net.

Want to find a verse about `TODO: search query`? Rap Genie has got your back:

> TODO: song lyrics here

This is a demo app built during the development of [Convex](https://convex.dev) vector search. Vector search made this app _really_ easy to build! Feel free to clone the app, make improvements, suggest changes, and build some cool shit on Convex.

The app is seeded with the [Genius dataset](https://www.kaggle.com/datasets/nikhilnayak123/5-million-song-lyrics-dataset) from Kaggle. Despite storing millions of songs the Rap Genie workload easily fit within the included resources on a Convex Pro account.

## Deployment instructions

TODO: update these

- Load the database from `load.py`.
- Extract verses and generate embeddings with
  `processSongBatch({limit: 25, recursive: true, minViews: 100000n})`.
- Run Convex sync with `npx convex dev`.
- Host website with `npx vite`.

## TODO

- add song count
- add copyright notice for Genius?
- get a domain name and host site. rapgenie.net?
- add link to github repo and convex
- change mascot to something more cartoony
- introduce some kind of filtering or ranking by popularity
- look up album art for each song with genius api
