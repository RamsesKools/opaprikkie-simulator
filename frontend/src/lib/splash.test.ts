import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { hideSplash } from "./splash.ts";

function reducedMotion(reduce: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduce && query.includes("reduce") }));
}

beforeEach(() => {
  vi.useFakeTimers();
  document.body.innerHTML = '<div id="splash"></div>';
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  document.body.innerHTML = "";
});

test("fades the splash out, then removes it", () => {
  reducedMotion(false);
  hideSplash();

  expect(document.getElementById("splash")).toHaveClass("done");
  vi.advanceTimersByTime(249);
  expect(document.getElementById("splash")).toBeInTheDocument();
  vi.advanceTimersByTime(1);
  expect(document.getElementById("splash")).not.toBeInTheDocument();
});

test("removes the splash at once with reduced motion", () => {
  reducedMotion(true);
  hideSplash();

  expect(document.getElementById("splash")).not.toBeInTheDocument();
});

test("does nothing without a splash", () => {
  document.body.innerHTML = "";
  expect(() => hideSplash()).not.toThrow();
});
