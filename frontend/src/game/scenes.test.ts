import { expect, test } from "vitest";
import { strings } from "../lib/strings.ts";
import type { GameView, LogEntry, RollSequence } from "./model.ts";
import { buildScenes } from "./scenes.ts";

const board = (rows: Record<number, number> = {}) => ({ 1: 0, 7: 0, ...rows });

const view = (overrides: Partial<GameView> = {}): GameView => ({
  phase: "choosing_target",
  names: ["Ann", "Opa"],
  controllers: ["human", "ai"],
  pegs: [board(), board()],
  current_player: 1,
  opening_roll: [1, 2, 3, 4, 5, 6],
  legal_targets: [],
  turn: 2,
  continuation: 0,
  winner: null,
  ...overrides,
});

const sequence = (overrides: Partial<RollSequence> = {}): RollSequence => ({
  kind: "roll_sequence",
  player: 0,
  turn: 1,
  continuation: 0,
  target: 1,
  rolls: [
    { dice: [1, 2, 3, 4, 5, 1], set_aside: [0, 5], reset: false },
    { dice: [2, 3, 4, 5], set_aside: [], reset: false },
  ],
  matches: 2,
  movement: 2,
  ...overrides,
});

test("shows every roll, then moves the peg", () => {
  const scenes = buildScenes([board(), board()], [sequence()], view());

  expect(scenes.map((scene) => scene.dice)).toEqual([
    [1, 2, 3, 4, 5, 1],
    [2, 3, 4, 5],
    [2, 3, 4, 5],
  ]);
  expect(scenes[0]).toMatchObject({
    setAside: [0, 5],
    target: 1,
    turn: 1,
    pegs: [board(), board()],
  });
  expect(scenes[2]).toMatchObject({
    message: strings.game.moves(1, 2),
    pegs: [board({ 1: 2 }), board()],
  });
});

test("skips dice-off entries", () => {
  const diceOff: LogEntry = { kind: "dice_off", rolls: [{ player: 0, dice: [1, 2] }] };

  expect(buildScenes([board(), board()], [diceOff], view())).toEqual([]);
});

test("announces a six-dice reset", () => {
  const rolls = [{ dice: [1, 1, 1, 1, 1, 1], set_aside: [0, 1, 2, 3, 4, 5], reset: true }];
  const scenes = buildScenes([board(), board()], [sequence({ rolls })], view());

  expect(scenes[0]?.message).toBe(strings.game.reset);
});

test("cues a continuation when the same player rolls again", () => {
  const topping = sequence({ target: 7, movement: 5 });
  const next = view({ current_player: 0, turn: 1, continuation: 1 });
  const scenes = buildScenes([board(), board()], [topping], next);

  expect(scenes.at(-1)).toMatchObject({
    message: strings.game.continuation(7),
    tone: "cue",
    dice: [],
  });
});

test("cues a continuation followed by a dead roll", () => {
  const deadRoll: LogEntry = {
    kind: "no_move",
    player: 0,
    turn: 1,
    continuation: 1,
    opening_roll: [1],
  };
  const scenes = buildScenes(
    [board(), board()],
    [sequence({ target: 7, movement: 5 }), deadRoll],
    view(),
  );

  expect(scenes.map((scene) => scene.tone)).toEqual(["info", "info", "info", "cue", "oh_no"]);
  expect(scenes.at(-1)?.message).toBe(strings.game.ohNo("Ann", true));
});

test("doesn't cue a continuation when the game ends", () => {
  const next = view({ phase: "finished", current_player: 0, winner: 0 });
  const scenes = buildScenes([board(), board()], [sequence()], next);

  expect(scenes.some((scene) => scene.tone === "cue")).toBe(false);
});

test("lets the AI think before its roll sequence", () => {
  const scenes = buildScenes(
    [board(), board()],
    [sequence({ player: 1 })],
    view({ current_player: 0 }),
  );

  expect(scenes[0]).toMatchObject({
    message: strings.game.aiThinking("Opa"),
    setAside: [],
    target: null,
  });
  expect(scenes.at(-1)?.pegs[1]).toEqual(board({ 1: 2 }));
});

test("tells the AI's dead turn in the third person", () => {
  const dead: LogEntry = {
    kind: "no_move",
    player: 1,
    turn: 2,
    continuation: 0,
    opening_roll: [6],
  };
  const scenes = buildScenes([board(), board()], [dead], view({ current_player: 0 }));

  expect(scenes).toHaveLength(1);
  expect(scenes[0]).toMatchObject({
    message: strings.game.ohNo("Opa", false),
    tone: "oh_no",
    dice: [6],
  });
});
