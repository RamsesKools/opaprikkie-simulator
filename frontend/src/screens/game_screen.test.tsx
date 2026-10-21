import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import {
  GameError,
  type Game,
  type GameClient,
  type LogEntry,
  type TakeOption,
} from "../game/model.ts";
import { timing } from "../game/timing.ts";
import { strings } from "../lib/strings.ts";
import { GameScreen } from "./game_screen.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const pegs = [
  { 1: 0, 2: 0, 3: 4 },
  { 1: 0, 2: 0, 3: 4 },
];

const game: Game = {
  ruleset: "classic",
  phase: "choosing_target",
  names: ["Ann", "Bob"],
  controllers: ["human", "human"],
  pegs,
  observation: {
    ruleset: "classic",
    seat: 1,
    pegs,
    opening_roll: [1, 3, 3, 4, 5, 6],
    legal_targets: [
      { target: 1, matches: 1, guaranteed_moves: 1, set_aside: [0] },
      { target: 3, matches: 2, guaranteed_moves: 1, set_aside: [1, 2] },
    ],
    turn: 1,
    continuation: 0,
    sequence: null,
    takes: [],
  },
  winner: null,
  seed: null,
  strategy: null,
};

function show(
  chooseTarget: GameClient["chooseTarget"],
  logs: LogEntry[] = [],
  autoPlay = true,
  shown: Game = game,
  { hints = true, client = {} }: { hints?: boolean; client?: Partial<GameClient> } = {},
) {
  const onFinished = vi.fn<(game: Game) => void>();
  const onError = vi.fn<(error: unknown) => void>();
  const screenWith = (settings: { autoPlay: boolean; hints: boolean }) => (
    <GameScreen
      client={{ chooseTarget, ...client } as GameClient}
      initial={{ game: shown, logs }}
      {...settings}
      onFinished={onFinished}
      onError={onError}
    />
  );
  const { rerender } = render(screenWith({ autoPlay, hints }));
  const toggle = (settings: { autoPlay: boolean; hints: boolean }) =>
    rerender(screenWith(settings));
  return { onFinished, onError, toggle };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

const tableDice = () => document.querySelectorAll(".throw-area .die").length;

const stack = (count: number) => screen.queryByRole("img", { name: strings.game.stack(count) });

const pickOne = () => {
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  fireEvent.click(within(bob).getByRole("button", { name: strings.game.column(1, 0) }));
};

test("throws the opening roll from the stack, then offers only legal targets", async () => {
  show(vi.fn<GameClient["chooseTarget"]>());
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  const ann = screen.getByRole("region", { name: strings.game.board("Ann") });

  expect(screen.getByText(strings.game.throws("Bob"))).toBeInTheDocument();
  expect(stack(6)).toBeInTheDocument();
  expect(tableDice()).toBe(0);
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(0);

  await advance(timing.ready);
  expect(screen.getByText(strings.game.pick("Bob"))).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: /left to throw$/ })).not.toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: strings.game.dice([1, 3, 3, 4, 5, 6]) }),
  ).toBeInTheDocument();
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(2);
  expect(ann.querySelectorAll("button:enabled")).toHaveLength(0);
});

test("previews a target's dice and landing row on hover", async () => {
  show(vi.fn<GameClient["chooseTarget"]>());
  await advance(timing.ready);
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  const column = (target: number, row: number) =>
    within(bob).getByRole("button", { name: strings.game.column(target, row) });
  const raised = () =>
    [...screen.getByRole("img", { name: strings.game.dice([1, 3, 3, 4, 5, 6]) }).children]
      .map((die, index) => (die.classList.contains("set-aside") ? index : -1))
      .filter((index) => index >= 0);
  const ghost = () => bob.querySelector<HTMLElement>(".ghost");

  fireEvent.mouseEnter(column(1, 0));
  expect(raised()).toEqual([0]);
  expect(ghost()?.style.getPropertyValue("--row")).toBe("1");
  expect(ghost()).not.toHaveClass("finishing");

  fireEvent.mouseEnter(column(3, 4));
  expect(raised()).toEqual([1, 2]);
  expect(ghost()?.style.getPropertyValue("--row")).toBe("5");
  expect(ghost()).toHaveClass("finishing");

  fireEvent.mouseLeave(column(3, 4));
  expect(raised()).toEqual([]);
  expect(ghost()).toBeNull();

  fireEvent.mouseEnter(column(2, 0));
  expect(ghost()).toBeNull();
});

const annGoesForOne: LogEntry = {
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
};

const throwStack = (count: number) =>
  screen.queryByRole("button", { name: strings.game.throwStack(count) });

test("saves the set-aside dice to the bowl, then throws the rest from the stack", async () => {
  show(vi.fn<GameClient["chooseTarget"]>(), [annGoesForOne]);
  expect(
    screen.getByRole("img", { name: strings.game.dice([1, 2, 3, 4, 5, 1]) }),
  ).toBeInTheDocument();
  expect(stack(4)).not.toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.kept([]) })).toBeInTheDocument();
  expect(screen.queryByText(strings.game.saved(2, 1))).not.toBeInTheDocument();

  await advance(timing.roll);
  expect(screen.getByText(strings.game.saved(2, 1))).toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.kept([1, 1]) })).toBeInTheDocument();
  expect(stack(4)).toBeInTheDocument();
  expect(throwStack(4)).not.toBeInTheDocument();
  expect(tableDice()).toBe(0);

  await advance(timing.ready);
  expect(screen.getByRole("img", { name: strings.game.dice([2, 3, 4, 5]) })).toBeInTheDocument();
  expect(stack(4)).not.toBeInTheDocument();
});

test("plays a dead turn before handing over", async () => {
  show(vi.fn<GameClient["chooseTarget"]>(), [
    { kind: "no_move", player: 0, turn: 1, continuation: 0, opening_roll: [2, 2, 2, 2, 2, 2] },
  ]);

  expect(stack(6)).toBeInTheDocument();
  await advance(timing.ready);
  expect(screen.getByText(strings.game.ohNo("Ann", true))).toBeInTheDocument();
  expect(screen.getByText(strings.game.turn(1, "Ann"))).toBeInTheDocument();
  await advance(timing.ohNo);
  await advance(timing.ready);
  expect(screen.getByText(strings.game.pick("Bob"))).toBeInTheDocument();
});

test("recovers from a failed choice on the next pick", async () => {
  const finished: Game = { ...game, phase: "finished", observation: null, winner: 1 };
  const chooseTarget = vi
    .fn<GameClient["chooseTarget"]>()
    .mockRejectedValueOnce(new GameError("internal_error", "down"))
    .mockResolvedValueOnce({ game: finished, logs: [] });
  const { onFinished, onError } = show(chooseTarget);
  await advance(timing.ready);

  pickOne();
  await advance(0);
  expect(screen.getByText(strings.errors.generic)).toBeInTheDocument();
  expect(onError).toHaveBeenCalledExactlyOnceWith(new GameError("internal_error", "down"));

  pickOne();
  await advance(0);
  expect(screen.queryByText(strings.errors.generic)).not.toBeInTheDocument();
  expect(onFinished).toHaveBeenCalledWith(finished);
});

test("throws from the stack when turns don't play automatically", async () => {
  show(vi.fn<GameClient["chooseTarget"]>(), [annGoesForOne], false);

  expect(screen.queryByRole("button", { name: /^Throw/ })).not.toBeInTheDocument();
  await advance(timing.roll);
  expect(screen.getByText(strings.game.throwPrompt("Ann"))).toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.kept([1, 1]) })).toBeInTheDocument();
  await advance(10_000);
  expect(screen.getByText(strings.game.throwPrompt("Ann"))).toBeInTheDocument();

  fireEvent.click(throwStack(4)!);
  expect(screen.getByRole("img", { name: strings.game.dice([2, 3, 4, 5]) })).toBeInTheDocument();
  expect(stack(4)).not.toBeInTheDocument();
  await advance(timing.roll);
  await advance(timing.move);

  expect(screen.getByText(strings.game.throwPrompt("Bob"))).toBeInTheDocument();
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(0);
  fireEvent.click(throwStack(6)!);
  expect(screen.getByText(strings.game.selectDice("Bob", true))).toBeInTheDocument();
  expect(
    screen.getByRole("group", { name: strings.game.dice([1, 3, 3, 4, 5, 6]) }),
  ).toBeInTheDocument();
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(2);
});

test("shows the seed and the AI strategy in dev mode", () => {
  const dev: Game = { ...game, controllers: ["human", "ai"], seed: "abc", strategy: "greedy" };
  show(vi.fn<GameClient["chooseTarget"]>(), [], true, dev);

  expect(screen.getByText(strings.game.seed("abc"))).toBeInTheDocument();
  expect(screen.getByText(strings.game.strategy("greedy"))).toBeInTheDocument();
});

test("shows neither outside dev mode", () => {
  show(vi.fn<GameClient["chooseTarget"]>());

  expect(screen.queryByText(/^Seed/)).not.toBeInTheDocument();
  expect(screen.queryByText(/^AI strategy/)).not.toBeInTheDocument();
});

test("says when the server can't be reached", async () => {
  show(vi.fn<GameClient["chooseTarget"]>().mockRejectedValue(new GameError("network", "offline")));
  await advance(timing.ready);

  pickOne();
  await advance(0);

  expect(screen.getByText(strings.errors.network)).toBeInTheDocument();
});

test("sends one pick while it's pending", async () => {
  const chooseTarget = vi.fn<GameClient["chooseTarget"]>(() => new Promise(() => {}));
  show(chooseTarget);
  await advance(timing.ready);

  pickOne();
  pickOne();

  expect(chooseTarget).toHaveBeenCalledOnce();
});

test("keeps the dice on the table until the next throw", async () => {
  const next: Game = { ...game, observation: { ...game.observation!, seat: 0, turn: 2 } };
  const logs: LogEntry[] = [
    {
      kind: "roll_sequence",
      player: 1,
      turn: 1,
      continuation: 0,
      target: 3,
      rolls: [
        { dice: [1, 3, 3, 4, 5, 6], set_aside: [1, 2], reset: false, matches: 2 },
        { dice: [2, 3, 5, 6], set_aside: [1], reset: false, matches: 1 },
      ],
      matches: 3,
      movement: 1,
    },
  ];
  show(vi.fn<GameClient["chooseTarget"]>().mockResolvedValue({ game: next, logs }));
  await advance(timing.ready);
  const die = (dice: number[], index: number) =>
    screen.getByRole("img", { name: strings.game.dice(dice) }).children[index];
  const opening = die([1, 3, 3, 4, 5, 6], 0);

  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  fireEvent.click(within(bob).getByRole("button", { name: strings.game.column(3, 4) }));
  await advance(0);
  expect(die([1, 3, 3, 4, 5, 6], 0)).toBe(opening);

  await advance(timing.roll);
  expect(tableDice()).toBe(0);
  await advance(timing.ready);
  const second = die([2, 3, 5, 6], 2);
  expect(second).not.toBe(opening);
  await advance(timing.roll);
  expect(screen.getByText(strings.game.moves(3, 1))).toBeInTheDocument();
  expect(die([2, 5, 6], 1)).toBe(second);
});

const board = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, 0]));

const twoSixes: Game = {
  ...game,
  pegs: [board, board],
  observation: {
    ...game.observation!,
    seat: 0,
    pegs: [board, board],
    opening_roll: [6, 6, 1, 2, 3, 4],
    legal_targets: [
      { target: 1, matches: 1, guaranteed_moves: 1, set_aside: [2] },
      { target: 6, matches: 2, guaranteed_moves: 2, set_aside: [0, 1] },
      { target: 7, matches: 2, guaranteed_moves: 2, set_aside: [0, 2, 4, 5] },
      { target: 12, matches: 1, guaranteed_moves: 1, set_aside: [0, 1] },
    ],
    takes: [
      { target: 1, dice: [2], matches: 1, row: 1, outcome: "throw", next_dice: 5 },
      { target: 6, dice: [0], matches: 1, row: 1, outcome: "throw", next_dice: 5 },
      { target: 6, dice: [1], matches: 1, row: 1, outcome: "throw", next_dice: 5 },
      { target: 6, dice: [0, 1], matches: 2, row: 2, outcome: "throw", next_dice: 4 },
      { target: 7, dice: [0, 2], matches: 1, row: 1, outcome: "throw", next_dice: 4 },
      { target: 7, dice: [4, 5], matches: 1, row: 1, outcome: "throw", next_dice: 4 },
      { target: 7, dice: [0, 2, 4, 5], matches: 2, row: 2, outcome: "throw", next_dice: 2 },
      { target: 12, dice: [0, 1], matches: 1, row: 1, outcome: "throw", next_dice: 4 },
    ],
  },
};

const sixTaken: TakeOption = {
  target: 6,
  dice: [1],
  matches: 1,
  row: 2,
  outcome: "throw",
  next_dice: 4,
};

const lockedToSix = (option: TakeOption = sixTaken): Game => ({
  ...twoSixes,
  phase: "choosing_dice",
  observation: {
    ...twoSixes.observation!,
    legal_targets: [{ target: 6, matches: 1, guaranteed_moves: 1, set_aside: [1] }],
    sequence: {
      target: 6,
      rolls: [{ dice: [6, 6, 1, 2, 3, 4], set_aside: [0], reset: false, matches: 1 }],
      matches: 1,
      dice: [2, 6, 3, 5, 1],
      reset: false,
    },
    takes: [option],
  },
});

const anns = () => screen.getByRole("region", { name: strings.game.board("Ann") });
const column = (target: number) =>
  within(anns()).getByRole("button", { name: strings.game.column(target, 0) });
const lit = () =>
  [...anns().querySelectorAll(".column.legal .label")].map((label) => Number(label.textContent));
const toggles = () => within(screen.getByRole("group")).getAllByRole("button");
const selectDie = (index: number) => fireEvent.click(toggles()[index]!);
const selected = () =>
  toggles()
    .map((die, index) => (die.getAttribute("aria-pressed") === "true" ? index : -1))
    .filter((index) => index >= 0);
const reroll = (label: string) => screen.queryByRole("button", { name: label });
const ghosts = () =>
  Object.fromEntries(
    [...anns().querySelectorAll(".column")]
      .filter((column) => column.querySelector(".ghost"))
      .map((column) => [
        Number(column.querySelector(".label")!.textContent),
        Number(column.querySelector<HTMLElement>(".ghost")!.style.getPropertyValue("--row")),
      ]),
  );
const pegRow = (target: number) =>
  Number(
    anns()
      .querySelectorAll<HTMLElement>(".column .peg")
      [target - 1]!.style.getPropertyValue("--row"),
  );

async function throwManually(shown: Game, hints = true, client: Partial<GameClient> = {}) {
  const shownScreen = show(vi.fn<GameClient["chooseTarget"]>(), [], false, shown, {
    hints,
    client,
  });
  fireEvent.click(screen.getByRole("button", { name: /^Throw/ }));
  await advance(0);
  return shownScreen;
}

test("selects a die only while the selection still fits a take", async () => {
  await throwManually(twoSixes);

  selectDie(3);
  expect(selected()).toEqual([]);
  selectDie(0);
  selectDie(2);
  expect(selected()).toEqual([0, 2]);
  selectDie(1);
  expect(selected()).toEqual([0, 2]);
  selectDie(2);
  selectDie(1);
  expect(selected()).toEqual([0, 1]);
});

test("lights the lanes the selection can be taken for, marks where the peg lands, and takes for the clicked lane", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  await throwManually(twoSixes, true, { take });

  selectDie(0);
  selectDie(1);

  expect(lit()).toEqual([6, 12]);
  expect(ghosts()).toEqual({ 6: 2, 12: 1 });
  expect(pegRow(6)).toBe(0);
  expect(screen.queryAllByRole("button", { name: /^Take/ })).toEqual([]);
  expect(reroll(strings.game.next("throw", 4, 6))).toBeNull();
  fireEvent.click(column(6));
  expect(take).toHaveBeenCalledExactlyOnceWith(6, [0, 1]);
});

test("lights nothing for a selection that isn't a whole take yet", async () => {
  await throwManually(twoSixes);

  selectDie(0);
  selectDie(2);
  selectDie(4);

  expect(selected()).toEqual([0, 2, 4]);
  expect(lit()).toEqual([]);
  expect(ghosts()).toEqual({});
  expect(column(7)).toBeDisabled();
});

test("with hints on, lights every legal lane up front, and a click selects its most matches", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  await throwManually(twoSixes, true, { take });
  expect(screen.getByText(strings.game.selectDice("Ann", true))).toBeInTheDocument();
  expect(lit()).toEqual([1, 6, 7, 12]);
  expect(ghosts()).toEqual({});

  fireEvent.click(column(7));
  expect(selected()).toEqual([0, 2, 4, 5]);
  expect(lit()).toEqual([7]);
  expect(take).not.toHaveBeenCalled();

  fireEvent.click(column(7));
  expect(take).toHaveBeenCalledExactlyOnceWith(7, [0, 2, 4, 5]);
});

test("with hints off, lights nothing until dice are selected, then plays the same", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  await throwManually(twoSixes, false, { take });
  expect(screen.getByText(strings.game.selectDice("Ann", false))).toBeInTheDocument();
  expect(lit()).toEqual([]);
  expect(column(6)).toBeDisabled();

  selectDie(0);
  selectDie(1);

  expect(lit()).toEqual([6, 12]);
  expect(ghosts()).toEqual({ 6: 2, 12: 1 });
  fireEvent.click(column(12));
  expect(take).toHaveBeenCalledExactlyOnceWith(12, [0, 1]);
});

test("in a later throw, keeps the locked lane lit and takes the selection from the stack's place", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), { client: { take } });
  expect(screen.getByRole("img", { name: strings.game.kept([6]) })).toBeInTheDocument();
  expect(ghosts()).toEqual({ 6: 1 });

  fireEvent.click(throwStack(5)!);
  expect(screen.getByText(strings.game.takeMore("Ann", 6))).toBeInTheDocument();
  expect(column(6)).toHaveClass("highlight");
  expect(ghosts()).toEqual({ 6: 1 });
  expect(reroll(strings.game.next("throw", 4, 6))).toBeNull();
  selectDie(0);
  expect(selected()).toEqual([]);
  selectDie(1);

  expect(ghosts()).toEqual({ 6: 2 });
  expect(pegRow(6)).toBe(0);
  const button = reroll("Reroll 4 dice")!;
  expect(button.closest(".stack-slot")).not.toBeNull();
  fireEvent.click(button);
  expect(take).toHaveBeenCalledExactlyOnceWith(6, [1]);
});

test("in a later throw, clicking the locked lane takes the selection too", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), {
    hints: false,
    client: { take },
  });
  fireEvent.click(throwStack(5)!);
  selectDie(1);
  fireEvent.click(column(6));

  expect(take).toHaveBeenCalledExactlyOnceWith(6, [1]);
});

test("with hints off, keeps the locked lane lit, and a click on it selects its most matches", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), {
    hints: false,
    client: { take },
  });
  fireEvent.click(throwStack(5)!);
  expect(lit()).toEqual([6]);

  fireEvent.click(column(6));
  expect(selected()).toEqual([1]);
  expect(take).not.toHaveBeenCalled();

  fireEvent.click(column(6));
  expect(take).toHaveBeenCalledExactlyOnceWith(6, [1]);
});

test("toggling automatic turns mid-sequence leaves the dice on the table until the take answers", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  const { toggle } = show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), {
    client: { take },
  });
  fireEvent.click(throwStack(5)!);
  const onTable = () => [...document.querySelectorAll(".throw-area .die")];
  const dice = onTable();

  toggle({ autoPlay: false, hints: false });
  toggle({ autoPlay: true, hints: false });
  await advance(0);

  expect(take).toHaveBeenCalledExactlyOnceWith(6, [1]);
  expect(onTable()).toHaveLength(5);
  onTable().forEach((die, index) => expect(die).toBe(dice[index]));
});

test.each([
  ["throw", 1, "Reroll 1 die"],
  ["reset", 6, "Reroll all for more 6's"],
  ["topped", 6, "Finish peg and reroll all dice"],
  ["ends", 0, "Move peg and end turn"],
  ["wins", 0, "Finish peg and win"],
] as const)("names what a %s take leads to on its button", (outcome, nextDice, label) => {
  show(
    vi.fn<GameClient["chooseTarget"]>(),
    [],
    false,
    lockedToSix({
      ...sixTaken,
      outcome,
      next_dice: nextDice,
    }),
  );
  fireEvent.click(throwStack(5)!);

  selectDie(1);

  expect(reroll(label)).toBeInTheDocument();
});

test("stops a sequence, with no stop before the first take", async () => {
  const update = {
    game: { ...twoSixes, observation: { ...twoSixes.observation!, seat: 1 } },
    logs: [],
  };
  const stop = vi.fn<GameClient["stop"]>().mockResolvedValue(update);
  await throwManually(twoSixes);
  expect(screen.queryByRole("button", { name: strings.game.stop })).not.toBeInTheDocument();
  cleanup();

  show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), { client: { stop } });
  fireEvent.click(throwStack(5)!);
  fireEvent.click(screen.getByRole("button", { name: strings.game.stop }));

  expect(stop).toHaveBeenCalledOnce();
});

test("toggling automatic turns leaves the dice on the table as they are", async () => {
  const take = vi.fn<GameClient["take"]>();
  const chooseTarget = vi.fn<GameClient["chooseTarget"]>();
  const { toggle } = await throwManually(twoSixes, true, { take, chooseTarget });
  const onTable = () => [...document.querySelectorAll(".throw-area .die")];
  const dice = onTable();

  toggle({ autoPlay: true, hints: true });
  await advance(10_000);
  onTable().forEach((die, index) => expect(die).toBe(dice[index]));
  toggle({ autoPlay: false, hints: true });

  expect(onTable()).toHaveLength(6);
  onTable().forEach((die, index) => expect(die).toBe(dice[index]));
  expect(take).not.toHaveBeenCalled();
  expect(chooseTarget).not.toHaveBeenCalled();
});

test("plays the rest of a sequence by itself when turns play automatically", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  show(vi.fn<GameClient["chooseTarget"]>(), [], true, lockedToSix(), { client: { take } });

  await advance(timing.ready);
  await advance(0);

  expect(take).toHaveBeenCalledExactlyOnceWith(6, [1]);
});

test("takes the options from the observation, without rules of its own", async () => {
  const shown: Game = {
    ...twoSixes,
    observation: {
      ...twoSixes.observation!,
      takes: [{ target: 9, dice: [2], matches: 1, row: 3, outcome: "throw", next_dice: 5 }],
    },
  };
  await throwManually(shown);

  selectDie(0);
  expect(selected()).toEqual([]);
  selectDie(2);
  expect(lit()).toEqual([9]);
  expect(ghosts()).toEqual({ 9: 3 });
});

test("doesn't retry a failed automatic take, and leaves the sequence to the player", async () => {
  const take = vi.fn<GameClient["take"]>().mockRejectedValue(new GameError("network", "offline"));
  show(vi.fn<GameClient["chooseTarget"]>(), [], true, lockedToSix(), { client: { take } });

  await advance(timing.ready);
  await advance(10_000);

  expect(take).toHaveBeenCalledOnce();
  expect(screen.getByText(strings.errors.network)).toBeInTheDocument();
  selectDie(1);
  fireEvent.click(reroll("Reroll 4 dice")!);
  expect(take).toHaveBeenCalledTimes(2);
  expect(screen.getByRole("button", { name: strings.game.stop })).toBeInTheDocument();
});

test("keeps the choice on screen but disabled while a take is pending", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), { client: { take } });
  fireEvent.click(throwStack(5)!);
  selectDie(1);

  fireEvent.click(reroll("Reroll 4 dice")!);

  expect(reroll("Reroll 4 dice")).toBeDisabled();
  expect(screen.getByRole("button", { name: strings.game.stop })).toBeDisabled();
  expect(toggles()[1]).toBeDisabled();
  expect(column(6)).toBeDisabled();
  expect(lit()).toEqual([6]);
});

test("clears an error once the selection changes", async () => {
  const take = vi.fn<GameClient["take"]>().mockRejectedValue(new GameError("network", "offline"));
  await throwManually(twoSixes, false, { take });
  selectDie(2);
  fireEvent.click(column(1));
  await advance(0);
  expect(screen.getByText(strings.errors.network)).toBeInTheDocument();

  selectDie(2);

  expect(screen.queryByText(strings.errors.network)).not.toBeInTheDocument();
});

test("catches up with the session after a choice in another tab", async () => {
  const elsewhere: Game = {
    ...twoSixes,
    observation: { ...twoSixes.observation!, seat: 1, turn: 2 },
  };
  const take = vi.fn<GameClient["take"]>().mockRejectedValue(new GameError("wrong_phase", "x"));
  const session = vi.fn<GameClient["session"]>().mockResolvedValue({ names: [], game: elsewhere });
  await throwManually(twoSixes, true, { take, session });
  selectDie(0);

  fireEvent.click(column(6));
  await advance(0);

  expect(session).toHaveBeenCalledOnce();
  expect(screen.getByText(strings.game.turn(2, "Bob"))).toBeInTheDocument();
});

test("hands a hot-seat game to the next human, who plays by hand too", async () => {
  const bobs: Game = { ...twoSixes, observation: { ...twoSixes.observation!, seat: 1, turn: 2 } };
  const logs: LogEntry[] = [
    {
      kind: "roll_sequence",
      player: 0,
      turn: 1,
      continuation: 0,
      target: 6,
      rolls: [
        { dice: [6, 6, 1, 2, 3, 4], set_aside: [0], reset: false, matches: 1 },
        { dice: [2, 6, 3, 5, 1], set_aside: [], reset: false, matches: 0 },
      ],
      matches: 1,
      movement: 1,
    },
  ];
  const stop = vi.fn<GameClient["stop"]>().mockResolvedValue({ game: bobs, logs });
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), { client: { stop } });
  fireEvent.click(throwStack(5)!);

  fireEvent.click(screen.getByRole("button", { name: strings.game.stop }));
  await advance(0);
  await advance(timing.roll);
  await advance(timing.move);

  expect(screen.getByText(strings.game.throwPrompt("Bob"))).toBeInTheDocument();
  fireEvent.click(throwStack(6)!);
  expect(screen.getByText(strings.game.selectDice("Bob", true))).toBeInTheDocument();
});

test("follows the toggles mid-sequence", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  const { toggle } = show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), {
    client: { take },
  });
  fireEvent.click(throwStack(5)!);
  expect(lit()).toEqual([6]);

  toggle({ autoPlay: false, hints: false });
  expect(lit()).toEqual([6]);
  expect(column(6)).toHaveClass("highlight");
  selectDie(1);
  expect(reroll("Reroll 4 dice")).toBeInTheDocument();

  toggle({ autoPlay: true, hints: false });
  await advance(0);
  expect(take).toHaveBeenCalledExactlyOnceWith(6, [1]);
});

test("empties the bowl for a six-dice reset by hand, keeping the count", () => {
  const locked = lockedToSix();
  const sequence = locked.observation!.sequence!;
  const reset: Game = {
    ...locked,
    observation: {
      ...locked.observation!,
      sequence: { ...sequence, dice: [6, 1, 2, 3, 4, 5], reset: true },
    },
  };
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, reset);

  expect(screen.getByText(strings.game.throwPrompt("Ann"))).toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.kept([]) })).toBeInTheDocument();
  expect(screen.getByText(strings.game.saved(1, 6))).toBeInTheDocument();
  expect(throwStack(6)).toBeInTheDocument();
});

test("rolls again after topping a peg by hand", async () => {
  const topped = { ...board, 6: 5 };
  const next: Game = {
    ...twoSixes,
    pegs: [topped, board],
    observation: { ...twoSixes.observation!, pegs: [topped, board], continuation: 1 },
  };
  const logs: LogEntry[] = [
    {
      kind: "roll_sequence",
      player: 0,
      turn: 1,
      continuation: 0,
      target: 6,
      rolls: [{ dice: [6, 6, 1, 2, 3, 4], set_aside: [0, 1], reset: false, matches: 2 }],
      matches: 2,
      movement: 2,
    },
  ];
  const take = vi.fn<GameClient["take"]>().mockResolvedValue({ game: next, logs });
  await throwManually(twoSixes, true, { take });
  selectDie(0);
  selectDie(1);

  fireEvent.click(column(6));
  await advance(0);
  await advance(timing.roll);
  await advance(timing.move);

  expect(screen.getByText(strings.game.continuation(6))).toBeInTheDocument();
});

test("shows no landing marks up front in automatic turns", async () => {
  show(vi.fn<GameClient["chooseTarget"]>());
  await advance(timing.ready);

  expect(document.querySelectorAll(".ghost")).toHaveLength(0);
});

test("plays on automatically after a failed take by hand once turns are automatic again", async () => {
  const take = vi
    .fn<GameClient["take"]>()
    .mockRejectedValueOnce(new GameError("network", "offline"))
    .mockImplementation(() => new Promise(() => {}));
  const { toggle } = show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix(), {
    client: { take },
  });
  fireEvent.click(throwStack(5)!);
  selectDie(1);
  fireEvent.click(reroll("Reroll 4 dice")!);
  await advance(0);

  toggle({ autoPlay: true, hints: true });
  await advance(0);

  expect(take).toHaveBeenCalledTimes(2);
});

test("previews nothing while a pick is pending", async () => {
  show(vi.fn<GameClient["chooseTarget"]>(() => new Promise(() => {})));
  await advance(timing.ready);
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  const columnOf = (target: number) =>
    within(bob).getByRole("button", { name: strings.game.column(target, target === 3 ? 4 : 0) });

  pickOne();
  fireEvent.mouseEnter(columnOf(3));

  expect(bob.querySelector(".ghost")).toBeNull();
});
