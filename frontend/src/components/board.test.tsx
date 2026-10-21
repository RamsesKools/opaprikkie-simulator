import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { strings } from "../lib/strings.ts";
import { Board } from "./board.tsx";

const pegs = Object.fromEntries(Array.from({ length: 12 }, (_, i) => [i + 1, i % 6]));

test("shows twelve columns with their rows", () => {
  render(<Board player={0} name="Ann" pegs={pegs} />);

  const columns = screen.getAllByRole("button");
  expect(columns).toHaveLength(12);
  expect(columns[0]).toHaveAccessibleName(strings.game.column(1, 0));
  expect(columns[11]).toHaveAccessibleName(strings.game.column(12, 5));
  expect(columns.every((column) => (column as HTMLButtonElement).disabled)).toBe(true);
});

test("only lets legal targets be picked", () => {
  const onPick = vi.fn<(target: number) => void>();
  render(<Board player={1} name="Bob" pegs={pegs} legal={[3, 9]} onPick={onPick} active />);

  const enabled = screen.getAllByRole<HTMLButtonElement>("button").filter((b) => !b.disabled);
  expect(enabled.map((button) => button.textContent)).toEqual(["3", "9"]);
  fireEvent.click(screen.getByRole("button", { name: strings.game.column(9, 2) }));
  fireEvent.click(screen.getByRole("button", { name: strings.game.column(4, 3) }));

  expect(onPick).toHaveBeenCalledExactlyOnceWith(9);
});

test("lets columns be picked without glowing", () => {
  const onPick = vi.fn<(target: number) => void>();
  const all = Object.keys(pegs).map(Number);
  const { container } = render(
    <Board player={0} name="Ann" pegs={pegs} pickable={all} onPick={onPick} active />,
  );

  fireEvent.click(screen.getByRole("button", { name: strings.game.column(4, 3) }));

  expect(onPick).toHaveBeenCalledExactlyOnceWith(4);
  expect(container.querySelectorAll(".legal")).toHaveLength(0);
});
