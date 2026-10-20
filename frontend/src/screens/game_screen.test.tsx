import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GameError, type Game, type GameClient, type LogEntry } from "../game/model.ts";
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
  render(
    <GameScreen
      client={{ chooseTarget, ...client } as GameClient}
      initial={{ game: shown, logs }}
      autoPlay={autoPlay}
      hints={hints}
      onFinished={onFinished}
      onError={onError}
    />,
  );
  return { onFinished, onError };
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
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(0);
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
      { target: 7, matches: 2, guaranteed_moves: 2, set_aside: [0, 2, 3, 5] },
      { target: 12, matches: 1, guaranteed_moves: 1, set_aside: [0, 1] },
    ],
  },
};

const lockedToSix: Game = {
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
  },
};

const anns = () => screen.getByRole("region", { name: strings.game.board("Ann") });
const column = (target: number) =>
  within(anns()).getByRole("button", { name: strings.game.column(target, 0) });
const lit = () =>
  [...anns().querySelectorAll(".column.legal .label")].map((label) => Number(label.textContent));
const selectDie = (index: number) =>
  fireEvent.click(within(screen.getByRole("group")).getAllByRole("button")[index]!);
const takes = () =>
  screen.queryAllByRole("button", { name: /^Take/ }).map((button) => button.textContent);

async function throwManually(shown: Game, hints = true, client: Partial<GameClient> = {}) {
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, shown, { hints, client });
  fireEvent.click(screen.getByRole("button", { name: /^Throw/ }));
  await advance(0);
}

test("lists a take option for each target the selected dice make, and lights those lanes", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  await throwManually(twoSixes, true, { take });

  expect(screen.getByText(strings.game.selectDice("Ann", true))).toBeInTheDocument();
  expect(takes()).toEqual([]);
  expect(lit()).toEqual([]);

  selectDie(0);
  selectDie(1);
  expect(takes()).toEqual([strings.game.take(2, 6), strings.game.take(1, 12)]);
  expect(lit()).toEqual([6, 12]);

  fireEvent.click(screen.getByRole("button", { name: strings.game.take(2, 6) }));
  expect(take).toHaveBeenCalledExactlyOnceWith(6, [0, 1]);
});

test("offers no take option unless every selected die is part of a match", async () => {
  await throwManually(twoSixes);

  selectDie(0);
  selectDie(2);

  expect(takes()).toEqual([strings.game.take(1, 7)]);
  selectDie(4);
  expect(takes()).toEqual([]);
  expect(column(6)).toBeDisabled();
});

test("previews the selected dice only, once some are selected", async () => {
  await throwManually(twoSixes);
  const ghost = () => anns().querySelector<HTMLElement>(".ghost");

  fireEvent.mouseEnter(column(1));
  expect(ghost()).toBeNull();

  selectDie(0);
  fireEvent.mouseEnter(column(6));
  expect(ghost()?.style.getPropertyValue("--row")).toBe("1");
});

test("keeps the locked lane lit for the next throw, and stops", async () => {
  const update = {
    game: { ...twoSixes, observation: { ...twoSixes.observation!, seat: 1 } },
    logs: [],
  };
  const stop = vi.fn<GameClient["stop"]>().mockResolvedValue(update);
  show(vi.fn<GameClient["chooseTarget"]>(), [], false, lockedToSix, { client: { stop } });

  expect(screen.getByRole("img", { name: strings.game.kept([6]) })).toBeInTheDocument();
  fireEvent.click(throwStack(5)!);
  expect(screen.getByText(strings.game.takeMore("Ann", 6))).toBeInTheDocument();
  expect(column(6)).toHaveClass("highlight");

  selectDie(1);
  expect(takes()).toEqual([strings.game.take(1, 6)]);
  selectDie(1);
  fireEvent.click(screen.getByRole("button", { name: strings.game.stop }));
  expect(stop).toHaveBeenCalledOnce();
});

test("offers no stop before the first take", async () => {
  await throwManually(twoSixes);

  expect(screen.queryByRole("button", { name: strings.game.stop })).not.toBeInTheDocument();
});

test("with hints off, takes the selected dice for the clicked column and shows a rejection", async () => {
  const take = vi
    .fn<GameClient["take"]>()
    .mockRejectedValue(
      new GameError("illegal_dice", "not every chosen die is part of a match for 5"),
    );
  await throwManually(twoSixes, false, { take });
  selectDie(0);

  expect(takes()).toEqual([]);
  expect(lit()).toEqual([]);
  fireEvent.click(column(5));
  await advance(0);

  expect(take).toHaveBeenCalledExactlyOnceWith(5, [0]);
  expect(screen.getByText("Not every chosen die is part of a match for 5.")).toBeInTheDocument();
});

test("with hints off, lets any column be picked in automatic turns", async () => {
  const chooseTarget = vi
    .fn<GameClient["chooseTarget"]>()
    .mockRejectedValue(new GameError("illegal_target", "2 isn't a legal target"));
  show(chooseTarget, [], true, game, { hints: false });
  await advance(timing.ready);
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });

  expect(bob.querySelectorAll(".legal")).toHaveLength(0);
  fireEvent.mouseEnter(within(bob).getByRole("button", { name: strings.game.column(1, 0) }));
  expect(document.querySelectorAll(".throw-area .set-aside")).toHaveLength(0);
  fireEvent.click(within(bob).getByRole("button", { name: strings.game.column(2, 0) }));
  await advance(0);

  expect(chooseTarget).toHaveBeenCalledExactlyOnceWith(2);
  expect(screen.getByText("2 isn't a legal target.")).toBeInTheDocument();
});

test("plays the rest of a sequence by itself when turns play automatically", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  show(vi.fn<GameClient["chooseTarget"]>(), [], true, lockedToSix, { client: { take } });

  await advance(timing.ready);
  await advance(0);

  expect(take).toHaveBeenCalledExactlyOnceWith(6, [1]);
});
