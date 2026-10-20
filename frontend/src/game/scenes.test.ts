import { expect, test } from "vitest";
import { strings } from "../lib/strings.ts";
import type { Game, LogEntry, RollSequence } from "./model.ts";
import { buildScenes, openingKey } from "./scenes.ts";

const board = (rows: Record<number, number> = {}) => ({ 1: 0, 7: 0, ...rows });

const game = (at: { seat: number; continuation?: number } | null): Game => ({
  ruleset: "classic",
  phase: at ? "choosing_target" : "finished",
  names: ["Ann", "Opa"],
  controllers: ["human", "ai"],
  pegs: [board(), board()],
  observation: at && {
    ruleset: "classic",
    seat: at.seat,
    pegs: [board(), board()],
    opening_roll: [1, 2, 3, 4, 5, 6],
    legal_targets: [],
    turn: 2,
    continuation: at.continuation ?? 0,
  },
  winner: at ? null : 0,
  seed: null,
  strategy: null,
});

const sequence = (overrides: Partial<RollSequence> = {}): RollSequence => ({
  kind: "roll_sequence",
  player: 0,
  turn: 1,
  continuation: 0,
  target: 1,
  rolls: [
    { dice: [1, 2, 3, 4, 5, 1], set_aside: [0, 5], reset: false, matches: 2 },
    { dice: [2, 3, 4, 5], set_aside: [], reset: false, matches: 0 },
  ],
  matches: 2,
  movement: 2,
  ...overrides,
});

test("shows every roll, then moves the peg", () => {
  const scenes = buildScenes([board(), board()], [sequence()], game({ seat: 1 }));

  expect(scenes.map((scene) => scene.dice)).toEqual([
    [1, 2, 3, 4, 5, 1],
    [2, 3, 4, 5],
    [2, 3, 4, 5],
  ]);
  expect(scenes[1]?.setAside).toEqual([]);
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

test("moves set-aside dice to the bowl and counts the matches", () => {
  const scenes = buildScenes([board(), board()], [sequence()], game({ seat: 1 }));

  expect(scenes.map(({ kept, count }) => ({ kept, count }))).toEqual([
    { kept: [], count: 0 },
    { kept: [1, 1], count: 2 },
    { kept: [1, 1], count: 2 },
  ]);
  expect(scenes[2]).toMatchObject({ dice: [2, 3, 4, 5], setAside: [] });
});

test("keeps the dice not set aside in hand", () => {
  const scenes = buildScenes([board(), board()], [sequence()], game({ seat: 1 }));

  expect(scenes.map((scene) => scene.hand)).toEqual([4, 4, 4]);
});

test("starts an AI turn with all six dice in hand", () => {
  const scenes = buildScenes([board(), board()], [sequence({ player: 1 })], game({ seat: 0 }));

  expect(scenes[0]).toMatchObject({ message: strings.game.aiThinking("Opa"), hand: 6 });
});

test("skips dice-off entries", () => {
  const diceOff: LogEntry = { kind: "dice_off", rolls: [{ player: 0, dice: [1, 2] }] };

  expect(buildScenes([board(), board()], [diceOff], game({ seat: 1 }))).toEqual([]);
});

test("announces a six-dice reset and empties the bowl", () => {
  const rolls = [
    { dice: [1, 1, 1, 1, 1, 1], set_aside: [0, 1, 2, 3, 4, 5], reset: false, matches: 6 },
    { dice: [1, 2, 3, 4, 5, 6], set_aside: [0], reset: true, matches: 1 },
  ];
  const scenes = buildScenes([board(), board()], [sequence({ rolls })], game({ seat: 1 }));

  expect(scenes[1]?.message).toBe(strings.game.reset);
  expect(scenes[1]).toMatchObject({ kept: [], count: 6 });
  expect(scenes.map((scene) => scene.hand)).toEqual([0, 5, 5]);
});

test("cues a continuation when the same player rolls again", () => {
  const topping = sequence({ target: 7, movement: 5 });
  const next = game({ seat: 0, continuation: 1 });
  const scenes = buildScenes([board(), board()], [topping], next);

  expect(scenes.at(-1)).toMatchObject({
    message: strings.game.continuation(7),
    tone: "cue",
    dice: [],
    hand: 6,
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
    game({ seat: 1 }),
  );

  expect(scenes.map((scene) => scene.tone)).toEqual(["info", "info", "info", "cue", "oh_no"]);
  expect(scenes.at(-1)?.message).toBe(strings.game.ohNo("Ann", true));
});

test("doesn't cue a continuation when the game ends", () => {
  const next = game(null);
  const scenes = buildScenes([board(), board()], [sequence()], next);

  expect(scenes.some((scene) => scene.tone === "cue")).toBe(false);
});

test("lets the AI think before its roll sequence", () => {
  const scenes = buildScenes([board(), board()], [sequence({ player: 1 })], game({ seat: 0 }));

  expect(scenes[0]).toMatchObject({
    message: strings.game.aiThinking("Opa"),
    setAside: [],
    target: null,
  });
  expect(scenes.at(-1)?.pegs[1]).toEqual(board({ 1: 2 }));
});

test("lets the AI think before its dead turn, told in the third person", () => {
  const dead: LogEntry = {
    kind: "no_move",
    player: 1,
    turn: 2,
    continuation: 0,
    opening_roll: [6],
  };
  const scenes = buildScenes([board(), board()], [dead], game({ seat: 0 }));

  expect(scenes).toHaveLength(2);
  expect(scenes[0]).toMatchObject({ message: strings.game.aiThinking("Opa"), dice: [6] });
  expect(scenes[1]).toMatchObject({
    message: strings.game.ohNo("Opa", false),
    tone: "oh_no",
    dice: [6],
  });
});

test("marks the throws after the opening roll as fresh", () => {
  const deadTurn: LogEntry = {
    kind: "no_move",
    player: 0,
    turn: 2,
    continuation: 0,
    opening_roll: [2, 2, 2, 2, 2, 2],
  };
  const scenes = buildScenes([board(), board()], [sequence(), deadTurn], game(null));

  expect(scenes.map(({ fresh, message }) => ({ fresh, message }))).toEqual([
    { fresh: false, message: strings.game.goesFor("Ann", 1) },
    { fresh: true, message: strings.game.goesFor("Ann", 1) },
    { fresh: false, message: strings.game.moves(1, 2) },
    { fresh: true, message: strings.game.ohNo("Ann", true) },
  ]);
});

test("keys the dice by their throw, so only a new throw tumbles in", () => {
  const scenes = buildScenes(
    [board(), board()],
    [
      sequence({
        rolls: [
          { dice: [1, 2, 3, 4, 5, 1], set_aside: [0, 5], reset: false, matches: 2 },
          { dice: [2, 3, 4, 1], set_aside: [3], reset: false, matches: 1 },
        ],
      }),
    ],
    game({ seat: 1 }),
  );

  expect(scenes.map(({ throwKey, slots }) => ({ throwKey, slots }))).toEqual([
    { throwKey: openingKey(1, 0), slots: [0, 1, 2, 3, 4, 5] },
    { throwKey: "1:0:1", slots: [0, 1, 2, 3] },
    { throwKey: "1:0:1", slots: [0, 1, 2] },
  ]);
});

test("keys the AI's opening roll and a dead turn like the opening roll on the table", () => {
  const dead: LogEntry = {
    kind: "no_move",
    player: 0,
    turn: 2,
    continuation: 0,
    opening_roll: [2, 2, 2, 2, 2, 2],
  };
  const scenes = buildScenes(
    [board(), board()],
    [sequence({ player: 1 }), dead],
    game({ seat: 1 }),
  );

  expect(scenes[0]).toMatchObject({ message: strings.game.aiThinking("Opa"), throwKey: "1:0:0" });
  expect(scenes.at(-1)).toMatchObject({ tone: "oh_no", throwKey: openingKey(2, 0) });
});
