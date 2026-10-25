import { fireEvent, screen } from "@testing-library/react";
import { render } from "../test_utils.tsx";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import { Slider } from "./slider.tsx";

const options = [
  { value: "a", label: "Alpha" },
  { value: "b", label: "Beta" },
  { value: "c", label: "Gamma" },
] as const;

function show(onChange = vi.fn<(value: string) => void>()) {
  function Controlled() {
    const [value, setValue] = useState<string>("b");
    return (
      <Slider
        label="Letter"
        options={options}
        value={value}
        onChange={(chosen) => {
          onChange(chosen);
          setValue(chosen);
        }}
      />
    );
  }
  render(<Controlled />);
  return onChange;
}

const radio = (name: string) => screen.getByRole("radio", { name });

test("is a labelled radio group with only the checked option in the tab order", () => {
  show();

  expect(screen.getByRole("radiogroup", { name: "Letter" })).toBeInTheDocument();
  expect(radio("Beta")).toBeChecked();
  expect(radio("Beta")).toHaveAttribute("tabindex", "0");
  expect(radio("Alpha")).not.toBeChecked();
  expect(radio("Alpha")).toHaveAttribute("tabindex", "-1");
});

test("selects a clicked option, and ignores a click on the current one", () => {
  const onChange = show();

  fireEvent.click(radio("Beta"));
  fireEvent.click(radio("Gamma"));

  expect(onChange).toHaveBeenCalledExactlyOnceWith("c");
  expect(radio("Gamma")).toBeChecked();
});

test.each([
  ["ArrowRight", "Gamma"],
  ["ArrowDown", "Gamma"],
  ["ArrowLeft", "Alpha"],
  ["ArrowUp", "Alpha"],
  ["Home", "Alpha"],
  ["End", "Gamma"],
])("moves focus and selection with %s", (key, label) => {
  show();

  fireEvent.keyDown(radio("Beta"), { key });

  expect(radio(label)).toBeChecked();
  expect(radio(label)).toHaveFocus();
});

test("stops at either end, and ignores other keys", () => {
  const onChange = show();

  fireEvent.keyDown(radio("Beta"), { key: "ArrowRight" });
  fireEvent.keyDown(radio("Gamma"), { key: "ArrowRight" });
  expect(radio("Gamma")).toBeChecked();
  expect(radio("Gamma")).toHaveFocus();
  fireEvent.keyDown(radio("Gamma"), { key: "Home" });
  fireEvent.keyDown(radio("Alpha"), { key: "ArrowLeft" });
  expect(radio("Alpha")).toBeChecked();
  fireEvent.keyDown(radio("Alpha"), { key: "a" });

  expect(onChange.mock.calls).toEqual([["c"], ["a"]]);
});
