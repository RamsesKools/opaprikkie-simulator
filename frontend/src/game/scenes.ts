import { strings } from "../lib/strings.ts";
import type { GameView, LogEntry, Pegs, RollSequence } from "./model.ts";
import { timing } from "./timing.ts";

export type Tone = "info" | "oh_no" | "cue";

export type Scene = {
  pegs: Pegs[];
  player: number;
  turn: number;
  dice: number[];
  setAside: number[];
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

export function buildScenes(start: Pegs[], log: LogEntry[], next: GameView): Scene[] {
  const scenes: Scene[] = [];
  let pegs = start;
  const turnLog = log.filter((entry) => entry.kind !== "dice_off");
  const nextPosition =
    next.phase === "finished" || next.current_player === null
      ? undefined
      : { player: next.current_player, continuation: next.continuation };

  turnLog.forEach((entry, index) => {
    const name = next.names[entry.player]!;
    const human = next.controllers[entry.player] === "human";
    const base = { player: entry.player, turn: entry.turn, tone: "info" as Tone };
    if (entry.kind === "no_move") {
      scenes.push({
        ...base,
        pegs,
        dice: entry.opening_roll,
        setAside: [],
        target: null,
        message: strings.game.ohNo(name, human),
        tone: "oh_no",
        ms: timing.ohNo,
      });
      return;
    }
    const { target, rolls, movement } = entry;
    const opening = rolls[0]!.dice;
    if (!human) {
      const message = strings.game.aiThinking(name);
      scenes.push({
        ...base,
        pegs,
        dice: opening,
        setAside: [],
        target: null,
        message,
        ms: timing.aiThink,
      });
    }
    for (const roll of rolls) {
      const message = roll.reset ? strings.game.reset : strings.game.goesFor(name, target);
      scenes.push({
        ...base,
        pegs,
        dice: roll.dice,
        setAside: roll.set_aside,
        target,
        message,
        ms: timing.roll,
      });
    }
    const last = rolls.at(-1)!;
    pegs = pegs.map((board, seat) =>
      seat === entry.player ? { ...board, [target]: board[target]! + movement } : board,
    );
    const shown = { ...base, pegs, dice: last.dice, setAside: last.set_aside, target };
    scenes.push({ ...shown, message: strings.game.moves(target, movement), ms: timing.move });
    const following = turnLog[index + 1] ?? nextPosition;
    if (isContinuation(entry, following)) {
      const message = strings.game.continuation(target);
      scenes.push({
        ...shown,
        dice: [],
        setAside: [],
        message,
        tone: "cue",
        ms: timing.continuation,
      });
    }
  });
  return scenes;
}
