import type { Mode } from "../game/model.ts";
import { defaultColours, type Colours } from "./colours.ts";
import { strings } from "./strings.ts";

const MAX_NAME = 20;

export function nameProblem(names: string[]): string | null {
  const valid = names.every((name) => name.trim().length > 0 && name.trim().length <= MAX_NAME);
  return valid ? null : strings.menu.nameLength;
}

/** Player 1 sits in both modes; player 2 and the AI each keep their own name. */
export type Roster = { players: [string, string]; ai: string };

export const defaultRoster: Roster = {
  players: [strings.menu.player(0), strings.menu.player(1)],
  ai: strings.menu.defaultAiName,
};

export const seatNames = ({ players, ai }: Roster, mode: Mode): [string, string] =>
  mode === "versus_ai" ? [players[0], ai] : players;

export function withSeat(roster: Roster, mode: Mode, seat: number, name: string): Roster {
  if (mode === "versus_ai" && seat === 1) return { ...roster, ai: name };
  const players: [string, string] = [...roster.players];
  players[seat] = name;
  return { ...roster, players };
}

export const withSeats = (roster: Roster, mode: Mode, [first, second]: [string, string]) =>
  withSeat(withSeat(roster, mode, 0, first), mode, 1, second);

/** What the menu shows; the app keeps it across games. */
export type Draft = {
  mode: Mode;
  roster: Roster;
  colours: Colours;
  seed: string;
  strategy: string;
};

export const newDraft: Draft = {
  mode: "versus_ai",
  roster: defaultRoster,
  colours: defaultColours,
  seed: "",
  strategy: "",
};
