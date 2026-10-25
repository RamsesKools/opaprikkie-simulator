import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { STORAGE_KEY } from "./lib/language.ts";

// Most tests read the English dictionary; the language tests clear this.
beforeEach(() => localStorage.setItem(STORAGE_KEY, "en"));
afterEach(() => {
  cleanup();
  localStorage.clear();
});
