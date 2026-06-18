import { defineConfig } from "vitest/config";

// Reducer/unit tests run as plain Node — no Workers or React plugins needed.
export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    environment: "node",
  },
});
