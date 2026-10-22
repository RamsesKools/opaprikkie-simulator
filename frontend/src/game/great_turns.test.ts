import { expect, test } from "vitest";
import { greatCutoff, isGreatTurn } from "./great_turns.ts";

test("has a cutoff for every lane", () => {
  expect(Object.keys(greatCutoff).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
});

test.each([
  [12, 2],
  [11, 2],
  [11, 3],
  [10, 3],
  [9, 3],
  [3, 5],
])("calls %i steps on lane %i great", (target, movement) => {
  expect(isGreatTurn(target, movement)).toBe(true);
});

test.each([
  [12, 1],
  [11, 1],
  [10, 2],
  [7, 4],
  [3, 4],
])("doesn't call %i steps on lane %i great", (target, movement) => {
  expect(isGreatTurn(target, movement)).toBe(false);
});

test("always counts a peg that goes from the bottom to the top", () => {
  for (const target of Object.keys(greatCutoff).map(Number)) {
    expect(isGreatTurn(target, 5)).toBe(true);
  }
});

test("rarer lanes need fewer steps", () => {
  expect(greatCutoff[12]).toBeLessThanOrEqual(greatCutoff[7]!);
});
