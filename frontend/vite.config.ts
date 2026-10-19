import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["src/test_setup.ts"],
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/main.tsx", "src/lib/api.d.ts", "src/test_setup.ts"],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
