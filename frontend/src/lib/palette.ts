import type { CSSProperties } from "react";

const seats = [
  { main: "#d63a2f", soft: "#fbe3e1" },
  { main: "#2f6bd6", soft: "#e1ebfb" },
] as const;

export function seatStyle(seat: number): CSSProperties {
  const { main, soft } = seats[seat % seats.length]!;
  return { "--seat": main, "--seat-soft": soft } as CSSProperties;
}
