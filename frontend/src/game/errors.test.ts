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

test.each([new GameError("illegal_target", "nope"), new Error("boom"), "boom"])(
  "falls back to a generic message for %s",
  (error) => {
    expect(isLost(error)).toBe(false);
    expect(isNetwork(error)).toBe(false);
    expect(errorMessage(error)).toBe(strings.errors.generic);
  },
);
