import { expect, test } from "vitest";
import {
  defaultRoster,
  namesValid,
  newDraft,
  translateRoster,
  seatNames,
  withSeat,
  withSeats,
  withStartedSeats,
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

const roster: Roster = {
  players: ["Ann", "Bob"],
  ai: "Oma",
  isDefault: [true, true, true],
};

test("seats player 1 against the AI or player 2", () => {
  expect(seatNames(roster, "versus_ai")).toEqual(["Ann", "Oma"]);
  expect(seatNames(roster, "hot_seat")).toEqual(["Ann", "Bob"]);
});

test("keeps the AI's name apart from player 2's", () => {
  expect(withSeat(roster, "versus_ai", 1, "Opa")).toEqual({
    players: ["Ann", "Bob"],
    ai: "Opa",
    isDefault: [true, true, false],
  });
  expect(withSeat(roster, "hot_seat", 1, "Cas")).toEqual({
    players: ["Ann", "Cas"],
    ai: "Oma",
    isDefault: [true, false, true],
  });
  expect(withSeat(roster, "versus_ai", 0, "Dee")).toEqual({
    players: ["Dee", "Bob"],
    ai: "Oma",
    isDefault: [false, true, true],
  });
});

test("fills both seats at once", () => {
  expect(withSeats(roster, "versus_ai", ["Eve", "Opa"])).toEqual({
    players: ["Eve", "Bob"],
    ai: "Opa",
    isDefault: [false, true, false],
  });
  expect(withSeats(roster, "hot_seat", ["Eve", "Fay"])).toEqual({
    players: ["Eve", "Fay"],
    ai: "Oma",
    isDefault: [false, false, true],
  });
});

test("starts from the default names", () => {
  expect(defaultRoster(strings)).toEqual({
    players: [strings.menu.player(0), strings.menu.player(1)],
    ai: strings.menu.defaultAiName,
    isDefault: [true, true, true],
  });
  expect(newDraft(nl).roster.players).toEqual(["Speler 1", "Speler 2"]);
});

test("translates default names and keeps the others", () => {
  expect(translateRoster(defaultRoster(en), nl)).toEqual(defaultRoster(nl));
  expect(
    translateRoster(
      { ...defaultRoster(en), players: ["Ann", "Player 2"], isDefault: [false, true, true] },
      nl,
    ),
  ).toEqual({ players: ["Ann", "Speler 2"], ai: "Opa", isDefault: [false, true, true] });
});

test("a typed name equal to a default stays on a switch", () => {
  const typed = withSeat(defaultRoster(en), "hot_seat", 1, "Player 2");
  const aiTyped = withSeat(typed, "versus_ai", 1, "Opa");

  expect(translateRoster(typed, nl).players).toEqual(["Speler 1", "Player 2"]);
  expect(translateRoster(aiTyped, nl)).toMatchObject({
    players: ["Speler 1", "Player 2"],
    ai: "Opa",
    isDefault: [true, false, false],
  });
});

test("a session name equal to a default stays on a switch", () => {
  const session = withSeats(defaultRoster(nl), "versus_ai", ["Speler 1", "Opa"]);

  expect(translateRoster(session, en)).toMatchObject({
    players: ["Speler 1", "Player 2"],
    ai: "Opa",
  });
});

test("storing a started game's names keeps which seats are default", () => {
  const started = withStartedSeats(defaultRoster(en), "versus_ai", ["Player 1", "Opa"]);

  expect(started.isDefault).toEqual([true, true, true]);
  expect(translateRoster(started, nl)).toEqual(defaultRoster(nl));
});
