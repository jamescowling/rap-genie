import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  songs: defineTable({
    genre: v.string(), // tag
    artist: v.string(),
    title: v.string(),
    year: v.int64(),
    lyrics: v.string(),
    popularity: v.int64(), // views
    features: v.string(),
    geniusId: v.int64(), // id
    embedding: v.optional(v.array(v.float64())),
  }).index("embedding", ["embedding"]),
});
