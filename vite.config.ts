import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  plugins: [react(), cloudflare()],
  resolve: {
    alias: {
      // lucide@0.563's package.json `module` field points at a non-existent
      // path; map the bare import to the real ESM entry.
      lucide: "lucide/dist/esm/lucide/src/lucide.js",
    },
  },
});
