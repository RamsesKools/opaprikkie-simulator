import { act, fireEvent, screen, within } from "@testing-library/react";
import { render } from "../test_utils.tsx";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { Game } from "../game/model.ts";
import { timing } from "../game/timing.ts";
import { en as strings } from "../lib/strings_en.ts";
import { Victory } from "./victory.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

const top = Object.fromEntries(Array.from({ length: 12 }, (_, index) => [index + 1, 5]));

const finished: Game = {
  ruleset: "classic",
  phase: "finished",
  names: ["Ann", "Bob"],
  controllers: ["human", "human"],
  pegs: [top, top],
  turns: 41,
  dice_counts: [
    [10, 20, 30, 40, 50, 60],
    [5, 5, 5, 5, 5, 5],
  ],
  observation: null,
  winner: 0,
  seed: null,
  strategy: null,
};

test("shows the winner, the number of turns, and each player's dice", () => {
  render(<Victory game={finished} onAgain={() => {}} />);

  expect(screen.getByText(strings.victory.wins("Ann"))).toBeInTheDocument();
  expect(screen.getByText(strings.victory.turns(41))).toBeInTheDocument();
  const ann = screen.getByRole("img", {
    name: strings.victory.chart("Ann", [10, 20, 30, 40, 50, 60]),
  });
  expect(
    within(ann)
      .getAllByText(/^\d+$/)
      .map((node) => node.textContent),
  ).toEqual(["10", "1", "20", "2", "30", "3", "40", "4", "50", "5", "60", "6"]);
  expect(
    screen.getByRole("img", { name: strings.victory.chart("Bob", [5, 5, 5, 5, 5, 5]) }),
  ).toBeInTheDocument();
});

test("draws the bars on one scale, so players compare", () => {
  render(<Victory game={finished} onAgain={() => {}} />);

  const heights = [...document.querySelectorAll<HTMLElement>(".bar")].map(
    (bar) => bar.style.height,
  );
  expect(heights[5]).toBe("100%");
  expect(heights[0]).toBe(`${(10 / 60) * 100}%`);
  expect(heights[6]).toBe(`${(5 / 60) * 100}%`);
});

test("says one turn in the singular", () => {
  render(<Victory game={{ ...finished, turns: 1 }} onAgain={() => {}} />);

  expect(screen.getByText(strings.victory.turns(1))).toHaveTextContent("1 turn.");
});

test("celebrates with confetti that clears itself and goes on to play again", async () => {
  const onAgain = vi.fn<() => void>();
  render(<Victory game={finished} onAgain={onAgain} />);
  expect(document.querySelector(".confetti")).not.toBeNull();

  fireEvent.click(screen.getByRole("button", { name: strings.victory.again }));
  expect(onAgain).toHaveBeenCalledOnce();
  await act(() => vi.advanceTimersByTimeAsync(timing.confetti));

  expect(document.querySelector(".confetti")).toBeNull();
});

test("copes with a game that threw nothing", () => {
  const empty = {
    ...finished,
    dice_counts: [
      [0, 0, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0],
    ],
  };
  render(<Victory game={empty} onAgain={() => {}} />);

  expect(document.querySelector<HTMLElement>(".bar")?.style.height).toBe("0%");
});
