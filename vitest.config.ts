import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: [path.resolve(__dirname, "./src/__tests__/setup.ts")],
  },
  resolve: {
    alias: {
      "@decky/manifest": path.resolve(__dirname, "./plugin.json"),
    },
  },
});
