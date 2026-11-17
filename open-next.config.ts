import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// All pages read live data from Neon, so no incremental cache is needed.
export default defineCloudflareConfig({});
