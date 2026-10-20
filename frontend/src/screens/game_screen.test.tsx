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

const pickOne = () => {
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  fireEvent.click(within(bob).getByRole("button", { name: strings.game.column(1, 0) }));
};

test("offers the opening roll and only legal targets to the current player", () => {
  show(vi.fn<GameClient["chooseTarget"]>());

  expect(screen.getByText(strings.game.pick("Bob"))).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: strings.game.dice([1, 3, 3, 4, 5, 6]) }),
  ).toBeInTheDocument();
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  const ann = screen.getByRole("region", { name: strings.game.board("Ann") });
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(2);
  expect(ann.querySelectorAll("button:enabled")).toHaveLength(0);
});

test("previews a target's dice and landing row on hover", () => {
  show(vi.fn<GameClient["chooseTarget"]>());
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

const throwButton = () => screen.queryByRole("button", { name: strings.game.throw });

test("keeps set-aside dice in the bowl with the running count", async () => {
  show(vi.fn<GameClient["chooseTarget"]>(), [annGoesForOne]);

  expect(screen.getByRole("img", { name: strings.game.kept([]) })).toBeInTheDocument();
  expect(screen.queryByText(strings.game.saved(2, 1))).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(timing.roll));
  expect(screen.getByText(strings.game.saved(2, 1))).toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.kept([1, 1]) })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.dice([2, 3, 4, 5]) })).toBeInTheDocument();
});

test("plays a dead turn before handing over", async () => {
  show(vi.fn<GameClient["chooseTarget"]>(), [
    { kind: "no_move", player: 0, turn: 1, continuation: 0, opening_roll: [2, 2, 2, 2, 2, 2] },
  ]);

  expect(screen.getByText(strings.game.ohNo("Ann", true))).toBeInTheDocument();
  expect(screen.getByText(strings.game.turn(1, "Ann"))).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(screen.getByText(strings.game.pick("Bob"))).toBeInTheDocument();
});

test("recovers from a failed choice on the next pick", async () => {
  const finished: Game = { ...game, phase: "finished", observation: null, winner: 1 };
  const chooseTarget = vi
    .fn<GameClient["chooseTarget"]>()
    .mockRejectedValueOnce(new GameError("internal_error", "down"))
    .mockResolvedValueOnce({ game: finished, logs: [] });
  const { onFinished, onError } = show(chooseTarget);

  pickOne();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(screen.getByText(strings.errors.generic)).toBeInTheDocument();
  expect(onError).toHaveBeenCalledExactlyOnceWith(new GameError("internal_error", "down"));

  pickOne();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(screen.queryByText(strings.errors.generic)).not.toBeInTheDocument();
  expect(onFinished).toHaveBeenCalledWith(finished);
});

test("waits for each throw when turns don't play automatically", async () => {
  show(vi.fn<GameClient["chooseTarget"]>(), [annGoesForOne], false);

  expect(throwButton()).not.toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(timing.roll));
  expect(screen.getByText(strings.game.throwPrompt("Ann"))).toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.kept([1, 1]) })).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(10_000));
  expect(screen.getByText(strings.game.throwPrompt("Ann"))).toBeInTheDocument();

  fireEvent.click(throwButton()!);
  expect(screen.getByRole("img", { name: strings.game.dice([2, 3, 4, 5]) })).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(timing.roll));
  await act(() => vi.advanceTimersByTimeAsync(timing.move));

  expect(screen.getByText(strings.game.throwPrompt("Bob"))).toBeInTheDocument();
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(0);
  fireEvent.click(throwButton()!);
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

  pickOne();
  await act(() => vi.advanceTimersByTimeAsync(0));

  expect(screen.getByText(strings.errors.network)).toBeInTheDocument();
});

test("sends one pick while it's pending", async () => {
  const chooseTarget = vi.fn<GameClient["chooseTarget"]>(() => new Promise(() => {}));
  show(chooseTarget);

  pickOne();
  pickOne();

  expect(chooseTarget).toHaveBeenCalledOnce();
});
