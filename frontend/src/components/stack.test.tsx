import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { strings } from "../lib/strings.ts";
import { Stack } from "./stack.tsx";

const rows = (stack: HTMLElement) =>
  [...stack.querySelectorAll(".stack-row")].map((row) => row.querySelectorAll(".die").length);

test.each([
  [6, [1, 2, 3]],
  [5, [2, 3]],
  [4, [2, 2]],
  [3, [1, 2]],
  [2, [1, 1]],
  [1, [1]],
  [0, []],
])("piles %i dice into a pyramid", (count, pyramid) => {
  render(<Stack count={count} player={0} />);

  expect(rows(screen.getByRole("img", { name: strings.game.stack(count) }))).toEqual(pyramid);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("throws when clicked", () => {
  const onThrow = vi.fn<() => void>();
  render(<Stack count={4} player={1} onThrow={onThrow} />);

  fireEvent.click(screen.getByRole("button", { name: strings.game.throwStack(4) }));

  expect(onThrow).toHaveBeenCalledOnce();
});
