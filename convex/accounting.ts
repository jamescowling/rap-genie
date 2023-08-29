// Temporary code to sanity-check function call accounting.

import { internalMutation } from "./_generated/server";

export const logAction = internalMutation({
  handler: async (ctx) => {
    await ctx.db.insert("actionLog", {
      timestamp: Date.now(),
    });
  },
});
