import { expect, test } from "vitest";
import { en as strings } from "../lib/strings_en.ts";
import { nl } from "../lib/strings_nl.ts";
import { errorMessage, isLost, isNetwork } from "./errors.ts";
import { GameError } from "./model.ts";

test.each(["no_session", "no_game"])("treats %s as a lost game", (code) => {
  const error = new GameError(code, code);

  expect(isLost(error)).toBe(true);
  expect(errorMessage(error, strings)).toBe(strings.errors.lost);
  expect(errorMessage(error, nl)).toBe(nl.errors.lost);
});

test("says when the server can't be reached", () => {
  expect(isNetwork(new GameError("network", "offline"))).toBe(true);
  expect(errorMessage(new GameError("network", "offline"), strings)).toBe(strings.errors.network);
  expect(errorMessage(new GameError("network", "offline"), nl)).toBe(nl.errors.network);
});

test("words a rejection from its code in the current language, not the API's message", () => {
  const error = new GameError("wrong_phase", "can't do that while finished");

  expect(errorMessage(error, strings)).toBe(strings.errors.wrongPhase);
  expect(errorMessage(error, nl)).toBe(nl.errors.wrongPhase);
});

test.each([
  ["locked", [7], strings.errors.illegalTarget.locked(7), nl.errors.illegalTarget.locked(7)],
  ["not_a_target", [], strings.errors.illegalTarget.notATarget, nl.errors.illegalTarget.notATarget],
  ["topped", [], strings.errors.illegalTarget.topped, nl.errors.illegalTarget.topped],
  ["no_match", [], strings.errors.illegalTarget.noMatch, nl.errors.illegalTarget.noMatch],
  ["locked", [7, 9], strings.errors.illegalTarget.other, nl.errors.illegalTarget.other],
  ["new_reason", [], strings.errors.illegalTarget.other, nl.errors.illegalTarget.other],
  [undefined, [], strings.errors.illegalTarget.other, nl.errors.illegalTarget.other],
])("words an illegal target for reason %s", (reason, legalTargets, english, dutch) => {
  const error = new GameError("illegal_target", "5 isn't a legal target", { reason, legalTargets });

  expect(errorMessage(error, strings)).toBe(english);
  expect(errorMessage(error, nl)).toBe(dutch);
});

test("a locked sequence without its one legal target gets the general sentence", () => {
  const error = new GameError("illegal_target", "locked", { reason: "locked" });

  expect(errorMessage(error, strings)).toBe(strings.errors.illegalTarget.other);
});

test.each([
  ["empty", strings.errors.illegalDice.empty, nl.errors.illegalDice.empty],
  ["no_match", strings.errors.illegalDice.noMatch, nl.errors.illegalDice.noMatch],
  ["not_dice", strings.errors.illegalDice.notDice, nl.errors.illegalDice.notDice],
  ["new_reason", strings.errors.illegalDice.other, nl.errors.illegalDice.other],
])("words illegal dice for reason %s", (reason, english, dutch) => {
  const error = new GameError("illegal_dice", "choose at least one match", { reason });

  expect(errorMessage(error, strings)).toBe(english);
  expect(errorMessage(error, nl)).toBe(dutch);
});

test.each([new GameError("internal_error", "nope"), new Error("boom"), "boom"])(
  "falls back to a generic message for %s",
  (error) => {
    expect(isLost(error)).toBe(false);
    expect(isNetwork(error)).toBe(false);
    expect(errorMessage(error, strings)).toBe(strings.errors.generic);
    expect(errorMessage(error, nl)).toBe(nl.errors.generic);
  },
);
