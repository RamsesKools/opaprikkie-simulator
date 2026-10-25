import { fireEvent, screen } from "@testing-library/react";
import { render } from "../test_utils.tsx";
import { expect, test, vi } from "vitest";
import { en as strings } from "../lib/strings_en.ts";
import { Scroll } from "./scroll.tsx";

const open = (onClose = vi.fn<() => void>()) => {
  render(
    <>
      <button type="button">Opener</button>
      <Scroll title="Title" onClose={onClose}>
        <p>Some text</p>
      </Scroll>
    </>,
  );
  return onClose;
};

test("is a dialog named by its title, with the text between a rolled header and footer", () => {
  open();

  const dialog = screen.getByRole("dialog", { name: "Title" });
  expect(dialog.querySelector(".roll.top")).toHaveTextContent("Title");
  expect(screen.getByRole("region", { name: "Title" })).toHaveTextContent("Some text");
  expect(dialog.querySelector(".roll.bottom")).toContainElement(
    screen.getByRole("button", { name: strings.close }),
  );
});

test("focuses Close, and Tab swaps between the text and Close", () => {
  open();
  const close = screen.getByRole("button", { name: strings.close });
  const text = screen.getByRole("region", { name: "Title" });
  expect(close).toHaveFocus();

  fireEvent.keyDown(window, { key: "Tab" });
  expect(text).toHaveFocus();
  fireEvent.keyDown(window, { key: "Tab", shiftKey: true });
  expect(close).toHaveFocus();
});

test("closes on Escape, Close, and a click outside, but not a click inside", () => {
  const onClose = open();

  fireEvent.keyDown(window, { key: "Enter" });
  fireEvent.click(screen.getByText("Some text"));
  expect(onClose).not.toHaveBeenCalled();

  fireEvent.keyDown(window, { key: "Escape" });
  fireEvent.click(screen.getByRole("button", { name: strings.close }));
  fireEvent.click(screen.getByRole("dialog").parentElement!);
  expect(onClose).toHaveBeenCalledTimes(3);
});

test("gives focus back to what opened it", () => {
  const opener = render(<button type="button">Opener</button>);
  screen.getByRole("button", { name: "Opener" }).focus();
  const { unmount } = render(
    <Scroll title="Title" onClose={() => {}}>
      <p>Some text</p>
    </Scroll>,
  );

  unmount();

  expect(screen.getByRole("button", { name: "Opener" })).toHaveFocus();
  opener.unmount();
});
