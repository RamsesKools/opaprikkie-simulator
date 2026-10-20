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
) {
  const client = { chooseTarget } as unknown as GameClient;
  const onFinished = vi.fn<(game: Game) => void>();
  const onError = vi.fn<(error: unknown) => void>();
  render(
    <GameScreen
      client={client}
      initial={{ game: shown, logs }}
      autoPlay={autoPlay}
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
  expect(screen.getByText(strings.game.pick("Bob"))).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: strings.game.dice([1, 3, 3, 4, 5, 6]) }),
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
