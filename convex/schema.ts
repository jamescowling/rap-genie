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
    processed: v.boolean(), // whether verses (and other things?) have been extracted
    // XXX add views field to index
  }).index("processed", ["processed"]),

  verses: defineTable({
    songId: v.id("songs"),
    text: v.string(),
    embedding: v.array(v.float64()),
  }).index("embedding", ["embedding"]),
});
