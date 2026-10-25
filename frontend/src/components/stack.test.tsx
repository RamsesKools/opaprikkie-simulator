import { fireEvent, screen } from "@testing-library/react";
import { render } from "../test_utils.tsx";
import { expect, test, vi } from "vitest";
import { en as strings } from "../lib/strings_en.ts";
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
])("piles %i dice into a pyramid", (count, pyramid) => {
  render(<Stack count={count} player={0} />);

  expect(rows(screen.getByRole("img", { name: strings.game.stack(count) }))).toEqual(pyramid);
  expect(screen.queryByRole("button")).not.toBeInTheDocument();
});

test("keeps an empty stack's place without announcing it", () => {
  const { container } = render(<Stack count={0} player={0} />);

  expect(screen.queryByRole("img")).not.toBeInTheDocument();
  expect(container.querySelector(".stack")).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelector(".stack")).toBeEmptyDOMElement();
});

test("throws when clicked", () => {
  const onThrow = vi.fn<() => void>();
  render(<Stack count={4} player={1} onThrow={onThrow} />);

  fireEvent.click(screen.getByRole("button", { name: strings.game.throwStack(4) }));

  expect(onThrow).toHaveBeenCalledOnce();
});

test("makes a clickable stack a round button labelled Throw dice", () => {
  render(<Stack count={4} player={1} onThrow={() => {}} />);

  const button = screen.getByRole("button", { name: strings.game.throwStack(4) });
  expect(button).toHaveClass("throw");
  expect(button).toHaveTextContent(strings.game.throwDice);
});

test("keeps a stack that can't be thrown plain, without the label", () => {
  render(<Stack count={4} player={1} />);

  expect(screen.getByRole("img", { name: strings.game.stack(4) })).not.toHaveClass("throw");
  expect(screen.queryByText(strings.game.throwDice)).not.toBeInTheDocument();
});
