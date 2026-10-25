import type { Mode } from "../game/model.ts";
import { defaultColours, type Colours } from "./colours.ts";
import type { Strings } from "./strings.ts";

const MAX_NAME = 20;

export const namesValid = (names: string[]) =>
  names.every((name) => name.trim().length > 0 && name.trim().length <= MAX_NAME);

/** Player 1 sits in both modes; player 2 and the AI each keep their own name. */
export type Roster = {
  players: [string, string];
  ai: string;
  /** Per slot (player 1, player 2, AI): untouched since it was filled with the language's default. */
  isDefault: [boolean, boolean, boolean];
};

export const defaultRoster = ({ menu }: Strings): Roster => ({
  players: [menu.player(0), menu.player(1)],
  ai: menu.defaultAiName,
  isDefault: [true, true, true],
});

/** Names still on their default follow the language; typed and session names stay. */
export function translateRoster(roster: Roster, to: Strings): Roster {
  const fresh = defaultRoster(to);
  const pick = (slot: number, name: string, other: string) =>
    roster.isDefault[slot] ? other : name;
  return {
    ...roster,
    players: [
      pick(0, roster.players[0], fresh.players[0]),
      pick(1, roster.players[1], fresh.players[1]),
    ],
    ai: pick(2, roster.ai, fresh.ai),
  };
}

export const seatNames = ({ players, ai }: Roster, mode: Mode): [string, string] =>
  mode === "versus_ai" ? [players[0], ai] : players;

const slotOf = (mode: Mode, seat: number) => (mode === "versus_ai" && seat === 1 ? 2 : seat);

function place(roster: Roster, mode: Mode, seat: number, name: string, isDefault: boolean) {
  const slot = slotOf(mode, seat);
  const flags: Roster["isDefault"] = [...roster.isDefault];
  flags[slot] = isDefault;
  if (slot === 2) return { ...roster, ai: name, isDefault: flags };
  const players: [string, string] = [...roster.players];
  players[slot] = name;
  return { ...roster, players, isDefault: flags };
}

/** The player typed this name, so it no longer follows the language. */
export const withSeat = (roster: Roster, mode: Mode, seat: number, name: string): Roster =>
  place(roster, mode, seat, name, false);

/** Names from the session are taken as they are; they never follow the language. */
export const withSeats = (roster: Roster, mode: Mode, [first, second]: [string, string]) =>
  withSeat(withSeat(roster, mode, 0, first), mode, 1, second);

/** Stores the names a game started with, trimmed, without touching whether they are defaults. */
export function withStartedSeats(roster: Roster, mode: Mode, [first, second]: [string, string]) {
  const keep = (seat: number) => roster.isDefault[slotOf(mode, seat)]!;
  return place(place(roster, mode, 0, first, keep(0)), mode, 1, second, keep(1));
}

/** What the menu shows; the app keeps it across games. */
export type Draft = {
  mode: Mode;
  roster: Roster;
  colours: Colours;
  seed: string;
  strategy: string;
};

export const newDraft = (strings: Strings): Draft => ({
  mode: "versus_ai",
  roster: defaultRoster(strings),
  colours: defaultColours,
  seed: "",
  strategy: "",
});
