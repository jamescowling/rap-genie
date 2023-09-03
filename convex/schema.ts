import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  songs: defineTable({
    genre: v.string(), // tag
    artist: v.string(),
    title: v.string(),
    year: v.int64(),
    lyrics: v.string(),
    features: v.string(),
    geniusViews: v.int64(),
    geniusId: v.int64(), // id
    processed: v.boolean(), // whether verses have been extracted
  })
    .index("processed", ["processed", "geniusViews"]) // used to find songs to process
    .index("geniusId", ["geniusId"]), // used for uniqueness on insert

  verses: defineTable({
    songId: v.id("songs"),
    text: v.string(),
    embedding: v.array(v.float64()),
  })
    .index("songId", ["songId"])
    .vectorIndex("embedding", { vectorField: "embedding", dimensions: 1536 }),
});
