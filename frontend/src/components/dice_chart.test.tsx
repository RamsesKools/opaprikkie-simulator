import { screen, within } from "@testing-library/react";
import { render } from "../test_utils.tsx";
import { expect, test } from "vitest";
import { en as strings } from "../lib/strings_en.ts";
import { DiceChart } from "./dice_chart.tsx";

const counts = [1, 2, 3, 4, 5, 6];

test("describes the counts as one image named after the player", () => {
  render(<DiceChart seat={0} name="Ann" counts={counts} max={6} />);

  const chart = screen.getByRole("img", { name: strings.victory.chart("Ann", counts) });
  expect(within(chart).getByText("Ann")).toBeInTheDocument();
});

test("shows each face with its count and a bar scaled to the shared maximum", () => {
  const { container } = render(<DiceChart seat={1} name="Bob" counts={counts} max={12} />);

  expect(container.querySelectorAll(".face")).toHaveLength(6);
  expect([...container.querySelectorAll(".number")].map((node) => node.textContent)).toEqual([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
  ]);
  expect([...container.querySelectorAll(".count")].map((node) => node.textContent)).toEqual([
    "1",
    "2",
    "3",
    "4",
    "5",
    "6",
  ]);
  const heights = [...container.querySelectorAll<HTMLElement>(".bar")].map(
    (bar) => bar.style.height,
  );
  expect(heights[5]).toBe("50%");
  expect(heights[1]).toBe(`${(2 / 12) * 100}%`);
});

test("draws empty bars when nothing was thrown", () => {
  const { container } = render(
    <DiceChart seat={0} name="Ann" counts={[0, 0, 0, 0, 0, 0]} max={0} />,
  );

  expect(
    [...container.querySelectorAll<HTMLElement>(".bar")].every((bar) => bar.style.height === "0%"),
  ).toBe(true);
});
