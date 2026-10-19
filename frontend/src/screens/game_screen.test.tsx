import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { GameError, type Game, type GameClient, type LogEntry } from "../game/model.ts";
import { strings } from "../lib/strings.ts";
import { GameScreen } from "./game_screen.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const pegs = [
  { 1: 0, 2: 0 },
  { 1: 0, 2: 0 },
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
    legal_targets: [{ target: 1, matches: 1, guaranteed_moves: 1 }],
    turn: 1,
    continuation: 0,
  },
  winner: null,
  seed: null,
  strategy: null,
};

function show(chooseTarget: GameClient["chooseTarget"], logs: LogEntry[] = []) {
  const client = { chooseTarget } as unknown as GameClient;
  const onFinished = vi.fn<(game: Game) => void>();
  render(<GameScreen client={client} initial={{ game, logs }} onFinished={onFinished} />);
  return onFinished;
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
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(1);
  expect(ann.querySelectorAll("button:enabled")).toHaveLength(0);
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
  const onFinished = show(chooseTarget);

  pickOne();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(screen.getByText(strings.game.error)).toBeInTheDocument();

  pickOne();
  await act(() => vi.advanceTimersByTimeAsync(0));
  expect(screen.queryByText(strings.game.error)).not.toBeInTheDocument();
  expect(onFinished).toHaveBeenCalledWith(finished);
});
