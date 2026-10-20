import { expect, test } from "vitest";
import {
  defaultRoster,
  nameProblem,
  seatNames,
  withSeat,
  withSeats,
  type Roster,
} from "./names.ts";
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

const roster: Roster = { players: ["Ann", "Bob"], ai: "Oma" };

test("seats player 1 against the AI or player 2", () => {
  expect(seatNames(roster, "versus_ai")).toEqual(["Ann", "Oma"]);
  expect(seatNames(roster, "hot_seat")).toEqual(["Ann", "Bob"]);
});

test("keeps the AI's name apart from player 2's", () => {
  expect(withSeat(roster, "versus_ai", 1, "Opa")).toEqual({ players: ["Ann", "Bob"], ai: "Opa" });
  expect(withSeat(roster, "hot_seat", 1, "Cas")).toEqual({ players: ["Ann", "Cas"], ai: "Oma" });
  expect(withSeat(roster, "versus_ai", 0, "Dee")).toEqual({ players: ["Dee", "Bob"], ai: "Oma" });
});

test("fills both seats at once", () => {
  expect(withSeats(roster, "versus_ai", ["Eve", "Opa"])).toEqual({
    players: ["Eve", "Bob"],
    ai: "Opa",
  });
  expect(withSeats(roster, "hot_seat", ["Eve", "Fay"])).toEqual({
    players: ["Eve", "Fay"],
    ai: "Oma",
  });
});

test("starts from the default names", () => {
  expect(defaultRoster).toEqual({
    players: [strings.menu.player(0), strings.menu.player(1)],
    ai: strings.menu.defaultAiName,
  });
});
