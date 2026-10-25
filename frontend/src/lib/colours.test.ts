import { afterEach, expect, test, vi } from "vitest";
import {
  defaultColours,
  loadColours,
  resolveColours,
  saveColours,
  seatColours,
  withColour,
  type Colours,
} from "./colours.ts";

afterEach(() => vi.restoreAllMocks());

const colours: Colours = { players: ["red", "blue"], ai: "orange" };

test("defaults to red for player 1, and blue for player 2 and the AI", () => {
  expect(seatColours(defaultColours, "hot_seat")).toEqual(["red", "blue"]);
  expect(seatColours(defaultColours, "versus_ai")).toEqual(["red", "blue"]);
});

test("picks the seats of the mode", () => {
  expect(seatColours(colours, "hot_seat")).toEqual(["red", "blue"]);
  expect(seatColours(colours, "versus_ai")).toEqual(["red", "orange"]);
});

test("recolours a seat in its own mode only", () => {
  expect(withColour(colours, "versus_ai", 1, "pink").ai).toBe("pink");
  expect(withColour(colours, "versus_ai", 1, "pink").players).toEqual(["red", "blue"]);
  expect(withColour(colours, "hot_seat", 1, "pink").players).toEqual(["red", "pink"]);
  expect(withColour(colours, "versus_ai", 0, "pink").players).toEqual(["pink", "blue"]);
});

test("moves the second seat to the first free colour on a clash", () => {
  expect(resolveColours({ players: ["blue", "blue"], ai: "red" }, "hot_seat").players).toEqual([
    "blue",
    "red",
  ]);
  expect(resolveColours({ players: ["red", "blue"], ai: "red" }, "versus_ai").ai).toBe("orange");
});

test("leaves colours that don't clash alone", () => {
  expect(resolveColours({ players: ["red", "red"], ai: "blue" }, "versus_ai")).toEqual({
    players: ["red", "red"],
    ai: "blue",
  });
});

test("keeps saved colours", () => {
  saveColours(colours);

  expect(loadColours()).toEqual(colours);
});

test("falls back to the defaults for nothing, junk, or an unknown colour", () => {
  expect(loadColours()).toEqual(defaultColours);
  for (const stored of [
    "{",
    "null",
    "[]",
    '{"players":["red"],"ai":"blue"}',
    '{"players":["red","green"],"ai":"blue"}',
  ]) {
    localStorage.setItem("opaprikkie.colours", stored);
    expect(loadColours()).toEqual(defaultColours);
  }
});

test("resolves a saved clash in the default mode", () => {
  saveColours({ players: ["red", "blue"], ai: "red" });

  expect(loadColours().ai).toBe("orange");
});

test("survives blocked storage", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });

  expect(() => saveColours(colours)).not.toThrow();
  expect(loadColours()).toEqual(defaultColours);
});
