import { createContext, useContext } from "react";
import { defaultColours, seatColours } from "./colours.ts";
import { colourStyle, type ColourId } from "./palette.ts";

/** The colour of each seat of the game on screen. */
export const SeatColours = createContext<readonly [ColourId, ColourId]>(
  seatColours(defaultColours, "versus_ai"),
);

/** The CSS variables for a seat's colour. */
export function useSeatStyle() {
  const colours = useContext(SeatColours);
  return (seat: number) => colourStyle(colours[seat % colours.length]!);
}
