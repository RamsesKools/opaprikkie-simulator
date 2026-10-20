import { expect, test } from "vitest";
import { takeMatches } from "./matching.ts";

test.each([
  [6, [6, 6], 2],
  [12, [6, 6], 1],
  [6, [6, 5], 0],
  [7, [1, 6, 6, 1], 2],
  [7, [1, 6, 6], 0],
  [8, [4, 4, 2, 6], 2],
  [8, [4, 4, 4], 0],
  [3, [1, 2], 0],
  [2, [1, 1], 0],
  [6, [], 0],
])("target %i takes %j as %i matches", (target, dice, matches) => {
  expect(takeMatches(target, dice)).toBe(matches);
});
