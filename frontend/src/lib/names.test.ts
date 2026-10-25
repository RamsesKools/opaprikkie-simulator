import { expect, test } from "vitest";
import {
  defaultRoster,
  namesValid,
  newDraft,
  translateRoster,
  seatNames,
  withSeat,
  withSeats,
  type Roster,
} from "./names.ts";
import { en, en as strings } from "./strings_en.ts";
import { nl } from "./strings_nl.ts";

test.each([
  [["Ann", "Bob"], true],
  [[" Ann ", "Bob"], true],
  [["a".repeat(20), "Bob"], true],
  [["", "Bob"], false],
  [["   ", "Bob"], false],
  [["a".repeat(21), "Bob"], false],
  [["Ann", " Ann"], true],
])("%j is valid: %j", (names, valid) => {
  expect(namesValid(names)).toBe(valid);
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
  expect(defaultRoster(strings)).toEqual({
    players: [strings.menu.player(0), strings.menu.player(1)],
    ai: strings.menu.defaultAiName,
  });
  expect(newDraft(nl).roster.players).toEqual(["Speler 1", "Speler 2"]);
});

test("translates default names and keeps the others", () => {
  expect(translateRoster(defaultRoster(en), en, nl)).toEqual({
    players: ["Speler 1", "Speler 2"],
    ai: "Opa",
  });
  expect(translateRoster({ players: ["Ann", "Player 2"], ai: "Oma" }, en, nl)).toEqual({
    players: ["Ann", "Speler 2"],
    ai: "Oma",
  });
});
