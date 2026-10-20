import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["tests/contract/**/*.test.ts"],
    environment: "node",
    provide: { backendUrl: process.env.BACKEND_URL ?? "http://127.0.0.1:8000" },
  },
});
