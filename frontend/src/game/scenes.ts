import { strings } from "../lib/strings.ts";
import type { Game, LogEntry, Pegs, RollSequence } from "./model.ts";
import { timing } from "./timing.ts";

export type Tone = "info" | "oh_no" | "cue";

export type Scene = {
  pegs: Pegs[];
  player: number;
  turn: number;
  dice: number[];
  setAside: number[];
  kept: number[];
  count: number;
  target: number | null;
  message: string;
  tone: Tone;
  ms: number;
};

type Position = { player: number; continuation: number };

function isContinuation(sequence: RollSequence, following: Position | undefined): boolean {
  return (
    following?.player === sequence.player && following.continuation === sequence.continuation + 1
  );
}

export function buildScenes(start: Pegs[], logs: LogEntry[], next: Game): Scene[] {
  const scenes: Scene[] = [];
  let pegs = start;
  const turnLog = logs.filter((entry) => entry.kind !== "dice_off");
  const nextPosition = next.observation
    ? { player: next.observation.seat, continuation: next.observation.continuation }
    : undefined;

  turnLog.forEach((entry, index) => {
    const name = next.names[entry.player]!;
    const human = next.controllers[entry.player] === "human";
    const base = { player: entry.player, turn: entry.turn, tone: "info" as Tone };
    const opening = entry.kind === "no_move" ? entry.opening_roll : entry.rolls[0]!.dice;
    const still = { ...base, pegs, dice: opening, setAside: [], kept: [], count: 0, target: null };
    if (!human) {
      scenes.push({ ...still, message: strings.game.aiThinking(name), ms: timing.aiThink });
    }
    if (entry.kind === "no_move") {
      const message = strings.game.ohNo(name, human);
      scenes.push({ ...still, message, tone: "oh_no", ms: timing.ohNo });
      return;
    }
    const { target, rolls, movement } = entry;
    let kept: number[] = [];
    let count = 0;
    for (const roll of rolls) {
      // A reset rolls all six again, so the bowl empties back onto the table.
      if (roll.reset) kept = [];
      const message = roll.reset ? strings.game.reset : strings.game.goesFor(name, target);
      scenes.push({
        ...base,
        pegs,
        dice: roll.dice,
        setAside: roll.set_aside,
        kept,
        count,
        target,
        message,
        ms: timing.roll,
      });
      kept = [...kept, ...roll.set_aside.map((index) => roll.dice[index]!)];
      count += roll.matches;
    }
    const last = rolls.at(-1)!;
    const leftover = last.dice.filter((_, index) => !last.set_aside.includes(index));
    pegs = pegs.map((board, seat) =>
      seat === entry.player ? { ...board, [target]: board[target]! + movement } : board,
    );
    const shown = { ...base, pegs, dice: leftover, setAside: [], kept, count, target };
    scenes.push({ ...shown, message: strings.game.moves(target, movement), ms: timing.move });
    const following = turnLog[index + 1] ?? nextPosition;
    if (isContinuation(entry, following)) {
      const message = strings.game.continuation(target);
      scenes.push({
        ...shown,
        dice: [],
        message,
        tone: "cue",
        ms: timing.continuation,
      });
    }
  });
  return scenes;
}
