import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { GameClient, GameView, LogEntry } from "../game/model.ts";
import { strings } from "../lib/strings.ts";
import { GameScreen } from "./game_screen.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const state: GameView = {
  phase: "choosing_target",
  names: ["Ann", "Bob"],
  controllers: ["human", "human"],
  pegs: [
    { 1: 0, 2: 0 },
    { 1: 0, 2: 0 },
  ],
  current_player: 1,
  opening_roll: [1, 3, 3, 4, 5, 6],
  legal_targets: [{ target: 1, matches: 1, guaranteed_moves: 1 }],
  turn: 1,
  continuation: 0,
  winner: null,
};

test("offers the opening roll and only legal targets to the current player", () => {
  const client = { chooseTarget: vi.fn<GameClient["chooseTarget"]>() } as unknown as GameClient;
  render(
    <GameScreen
      client={client}
      initial={{ state, log: [] }}
      onFinished={vi.fn<(view: GameView) => void>()}
    />,
  );

  expect(screen.getByText(strings.game.pick("Bob"))).toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: strings.game.dice(state.opening_roll) }),
  ).toBeInTheDocument();
  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  const ann = screen.getByRole("region", { name: strings.game.board("Ann") });
  expect(bob.querySelectorAll("button:enabled")).toHaveLength(1);
  expect(ann.querySelectorAll("button:enabled")).toHaveLength(0);
});

test("plays a dead turn before handing over", async () => {
  const log: LogEntry[] = [
    { kind: "no_move", player: 0, turn: 1, continuation: 0, opening_roll: [2, 2, 2, 2, 2, 2] },
  ];
  const client = { chooseTarget: vi.fn<GameClient["chooseTarget"]>() } as unknown as GameClient;
  render(
    <GameScreen
      client={client}
      initial={{ state, log }}
      onFinished={vi.fn<(view: GameView) => void>()}
    />,
  );

  expect(screen.getByText(strings.game.ohNo("Ann", true))).toBeInTheDocument();
  expect(screen.getByText(strings.game.turn(1, "Ann"))).toBeInTheDocument();
  await act(() => vi.advanceTimersByTimeAsync(5000));
  expect(screen.getByText(strings.game.pick("Bob"))).toBeInTheDocument();
});

test("says something went wrong when a choice fails", async () => {
  const client = { chooseTarget: () => Promise.reject(new Error("down")) } as unknown as GameClient;
  render(
    <GameScreen
      client={client}
      initial={{ state, log: [] }}
      onFinished={vi.fn<(view: GameView) => void>()}
    />,
  );

  const bob = screen.getByRole("region", { name: strings.game.board("Bob") });
  fireEvent.click(within(bob).getByRole("button", { name: strings.game.column(1, 0) }));
  await act(() => vi.advanceTimersByTimeAsync(0));

  expect(screen.getByText(strings.game.error)).toBeInTheDocument();
});
