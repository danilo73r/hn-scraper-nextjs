import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    restoreMocks: true,
    projects: [
      {
        extends: true,
        test: {
          name: "frontend",
          environment: "jsdom",
          include: ["tests/frontend/**/*.test.tsx"],
          setupFiles: ["tests/setup/react.ts"],
        },
      },
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          globalSetup: ["tests/setup/parser-fixtures.ts"],
        },
      },
      {
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          testTimeout: 15_000,
          hookTimeout: 120_000,
        },
      },
      { test: { name: "live", include: ["tests/live/**/*.test.ts"] } },
    ],
  },
});
