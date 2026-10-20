import { expect, test } from "vitest";
import { strings } from "../lib/strings.ts";
import { errorMessage, isLost, isNetwork } from "./errors.ts";
import { GameError } from "./model.ts";

test.each(["no_session", "no_game"])("treats %s as a lost game", (code) => {
  const error = new GameError(code, code);

  expect(isLost(error)).toBe(true);
  expect(errorMessage(error)).toBe(strings.errors.lost);
});

test("says when the server can't be reached", () => {
  expect(isNetwork(new GameError("network", "offline"))).toBe(true);
  expect(errorMessage(new GameError("network", "offline"))).toBe(strings.errors.network);
});

test.each(["wrong_phase", "illegal_target", "illegal_dice"])(
  "shows the rejection the API gave for %s as a sentence",
  (code) => {
    expect(errorMessage(new GameError(code, "5 isn't a legal target"))).toBe(
      "5 isn't a legal target.",
    );
    expect(errorMessage(new GameError(code, "choose at least one match"))).toBe(
      "Choose at least one match.",
    );
  },
);

test.each([new GameError("internal_error", "nope"), new Error("boom"), "boom"])(
  "falls back to a generic message for %s",
  (error) => {
    expect(isLost(error)).toBe(false);
    expect(isNetwork(error)).toBe(false);
    expect(errorMessage(error)).toBe(strings.errors.generic);
  },
);
