import type { Mode } from "../game/model.ts";
import { isColourId, palette, type ColourId } from "./palette.ts";

/** Like the names: player 1 sits in both modes; player 2 and the AI each keep their own. */
export type Colours = { players: [ColourId, ColourId]; ai: ColourId };

export const defaultColours: Colours = { players: ["red", "blue"], ai: "blue" };

export const seatColours = ({ players, ai }: Colours, mode: Mode): [ColourId, ColourId] =>
  mode === "versus_ai" ? [players[0], ai] : players;

export function withColour(colours: Colours, mode: Mode, seat: number, colour: ColourId): Colours {
  if (mode === "versus_ai" && seat === 1) return { ...colours, ai: colour };
  const players: [ColourId, ColourId] = [...colours.players];
  players[seat] = colour;
  return { ...colours, players };
}

/** Moves the second seat to the first free colour when both seats of the mode share one. */
export function resolveColours(colours: Colours, mode: Mode): Colours {
  const [first, second] = seatColours(colours, mode);
  if (first !== second) return colours;
  const free = palette.find(({ id }) => id !== first)!.id;
  return withColour(colours, mode, 1, free);
}

const KEY = "opaprikkie.colours";

export function saveColours(colours: Colours) {
  try {
    localStorage.setItem(KEY, JSON.stringify(colours));
  } catch {
    // Storage can be blocked; the colours then only last until the next reload.
  }
}

export function loadColours(): Colours {
  try {
    const stored: unknown = JSON.parse(localStorage.getItem(KEY) ?? "null");
    const { players, ai } = stored as { players?: unknown[]; ai?: unknown };
    const [first, second] = players ?? [];
    if (isColourId(first) && isColourId(second) && isColourId(ai)) {
      return resolveColours({ players: [first, second], ai }, "versus_ai");
    }
  } catch {
    // Missing, malformed, or blocked storage falls back to the defaults.
  }
  return defaultColours;
}
