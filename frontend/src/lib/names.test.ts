import { expect, test } from "vitest";
import { nameProblem } from "./names.ts";
import { strings } from "./strings.ts";

test.each([
  [["Ann", "Bob"], null],
  [[" Ann ", "Bob"], null],
  [["a".repeat(20), "Bob"], null],
  [["", "Bob"], strings.menu.nameLength],
  [["   ", "Bob"], strings.menu.nameLength],
  [["a".repeat(21), "Bob"], strings.menu.nameLength],
  [["Ann", " Ann"], null],
])("%j gives %j", (names, problem) => {
  expect(nameProblem(names)).toBe(problem);
});
