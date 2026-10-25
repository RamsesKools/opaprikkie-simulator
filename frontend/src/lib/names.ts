import type { Mode } from "../game/model.ts";
import { defaultColours, type Colours } from "./colours.ts";
import type { Strings } from "./strings.ts";

const MAX_NAME = 20;

export const namesValid = (names: string[]) =>
  names.every((name) => name.trim().length > 0 && name.trim().length <= MAX_NAME);

/** Player 1 sits in both modes; player 2 and the AI each keep their own name. */
export type Roster = { players: [string, string]; ai: string };

export const defaultRoster = ({ menu }: Strings): Roster => ({
  players: [menu.player(0), menu.player(1)],
  ai: menu.defaultAiName,
});

/** Names still on their default follow the language; typed ones stay. */
export function translateRoster(roster: Roster, from: Strings, to: Strings): Roster {
  const before = defaultRoster(from);
  const after = defaultRoster(to);
  const pick = (name: string, old: string, fresh: string) => (name === old ? fresh : name);
  return {
    players: [
      pick(roster.players[0], before.players[0], after.players[0]),
      pick(roster.players[1], before.players[1], after.players[1]),
    ],
    ai: pick(roster.ai, before.ai, after.ai),
  };
}

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

export const newDraft = (strings: Strings): Draft => ({
  mode: "versus_ai",
  roster: defaultRoster(strings),
  colours: defaultColours,
  seed: "",
  strategy: "",
});
