import type { CSSProperties } from "react";

/** Distinct from each other, the felt green, the wood, and the gold of topped pegs. */
export const palette = [
  { id: "red", main: "#d63a2f", soft: "#fbe3e1" },
  { id: "orange", main: "#e0701a", soft: "#fbe9d9" },
  { id: "pink", main: "#d6479c", soft: "#f9e1f0" },
  { id: "purple", main: "#7b3fc4", soft: "#ece1f8" },
  { id: "blue", main: "#2f6bd6", soft: "#e1ebfb" },
  { id: "cyan", main: "#1799b8", soft: "#ddf1f6" },
  { id: "slate", main: "#4a4f5c", soft: "#e4e5e9" },
  { id: "maroon", main: "#8c1d40", soft: "#f2dce3" },
] as const;

export type ColourId = (typeof palette)[number]["id"];

export const isColourId = (value: unknown): value is ColourId =>
  palette.some(({ id }) => id === value);

export function colourStyle(id: ColourId): CSSProperties {
  const { main, soft } = palette.find((colour) => colour.id === id)!;
  return { "--seat": main, "--seat-soft": soft } as CSSProperties;
}
