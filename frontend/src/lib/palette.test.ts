import { expect, test } from "vitest";
import { colourStyle, isColourId, palette } from "./palette.ts";

const hue = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => parseInt(hex.slice(at, at + 2), 16) / 255) as [
    number,
    number,
    number,
  ];
  const max = Math.max(r, g, b);
  const delta = max - Math.min(r, g, b);
  if (delta === 0) return 0;
  const sector =
    max === r ? ((g - b) / delta + 6) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
  return sector * 60;
};

test("has eight colours, none repeated", () => {
  expect(palette).toHaveLength(8);
  expect(new Set(palette.map(({ id }) => id)).size).toBe(8);
  expect(new Set(palette.map(({ main }) => main)).size).toBe(8);
});

test("keeps clear of the felt green and the gold of topped pegs", () => {
  for (const { id, main } of palette) {
    const degrees = hue(main);
    expect(degrees < 60 || degrees > 170, `${id} at ${degrees} degrees`).toBe(true);
  }
});

test("styles a colour with its main and soft tone", () => {
  expect(colourStyle("red")).toEqual({ "--seat": "#d63a2f", "--seat-soft": "#fbe3e1" });
  expect(isColourId("blue")).toBe(true);
  expect(isColourId("green")).toBe(false);
});
