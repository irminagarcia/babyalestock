import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/** Minimal OpenNext config — no R2 cache required for first Workers deploy. */
export default defineCloudflareConfig();
