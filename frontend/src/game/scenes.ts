import { strings } from "../lib/strings.ts";
import type { Game, LogEntry, Pegs, Roll, RollSequence } from "./model.ts";
import { timing } from "./timing.ts";

export type Tone = "info" | "oh_no" | "cue";

export type Scene = {
  pegs: Pegs[];
  player: number;
  turn: number;
  dice: number[];
  /** The throw the dice come from; the dice only tumble in when it changes. */
  throwKey: string;
  /** Each die's place in that throw, so dice taken away don't shift the rest. */
  slots: number[];
  setAside: number[];
  /** The dice in the stack, not yet thrown. */
  hand: number;
  kept: number[];
  count: number;
  target: number | null;
  message: string;
  tone: Tone;
  /** The next throw waits in the stack, for a human's click with automatic turns off. */
  ready: boolean;
  ms: number;
};

export const throwKey = (turn: number, continuation: number, throwIndex: number) =>
  `${turn}:${continuation}:${throwIndex}`;

export const openingKey = (turn: number, continuation: number) => throwKey(turn, continuation, 0);

/** The dice in the bowl once `rolls` are taken; a reset throw empties it back onto the table. */
export function bowl(rolls: Roll[], reset: boolean): number[] {
  let kept: number[] = [];
  for (const roll of rolls) {
    if (roll.reset) kept = [];
    kept = [...kept, ...roll.set_aside.map((index) => roll.dice[index]!)];
  }
  return reset ? [] : kept;
}

const allSlots = (dice: number[]) => dice.map((_, index) => index);

type Position = { player: number; continuation: number };

function isContinuation(sequence: RollSequence, following: Position | undefined): boolean {
  return (
    following?.player === sequence.player && following.continuation === sequence.continuation + 1
  );
}

type Ready = Pick<
  Scene,
  "pegs" | "player" | "turn" | "hand" | "kept" | "count" | "target" | "message"
>;

const readyScene = (scene: Ready): Scene => ({
  ...scene,
  dice: [],
  throwKey: "",
  slots: [],
  setAside: [],
  tone: "info",
  ready: true,
  ms: timing.ready,
});

/** `thrown` counts the throws of the first sequence already on the table, from a manual turn. */
export function buildScenes(start: Pegs[], logs: LogEntry[], next: Game, thrown = 0): Scene[] {
  const scenes: Scene[] = [];
  let pegs = start;
  const turnLog = logs.filter((entry) => entry.kind !== "dice_off");
  const nextPosition = next.observation
    ? { player: next.observation.seat, continuation: next.observation.continuation }
    : undefined;

  turnLog.forEach((entry, index) => {
    const name = next.names[entry.player]!;
    const human = next.controllers[entry.player] === "human";
    const base = { player: entry.player, turn: entry.turn, tone: "info" as Tone, ready: false };
    const opening = entry.kind === "no_move" ? entry.opening_roll : entry.rolls[0]!.dice;
    const still = {
      ...base,
      pegs,
      dice: opening,
      throwKey: openingKey(entry.turn, entry.continuation),
      slots: allSlots(opening),
      setAside: [],
      hand: 0,
      kept: [],
      count: 0,
      target: null,
    };
    // A human throws the opening roll of a sequence before picking its target.
    if (!human || entry.kind === "no_move") {
      const message = strings.game.throws(name);
      scenes.push(readyScene({ ...still, hand: opening.length, message }));
    }
    if (!human) {
      scenes.push({ ...still, message: strings.game.aiThinking(name), ms: timing.aiThink });
    }
    if (entry.kind === "no_move") {
      const message = strings.game.ohNo(name, human);
      scenes.push({ ...still, message, tone: "oh_no", ms: timing.ohNo });
      return;
    }
    const { target, rolls, movement } = entry;
    const onTable = index === 0 ? thrown : 0;
    let kept: number[] = [];
    let count = 0;
    for (const [throwIndex, roll] of rolls.entries()) {
      // A reset rolls all six again, so the bowl empties back onto the table.
      if (roll.reset) kept = [];
      const message = roll.reset ? strings.game.reset : strings.game.goesFor(name, target);
      const shared = { ...base, pegs, kept, count, target, message };
      if (throwIndex >= Math.max(onTable, 1)) {
        scenes.push(readyScene({ ...shared, hand: roll.dice.length }));
      }
      if (throwIndex >= onTable - 1)
        scenes.push({
          ...shared,
          dice: roll.dice,
          throwKey: throwKey(entry.turn, entry.continuation, throwIndex),
          slots: allSlots(roll.dice),
          setAside: roll.set_aside,
          hand: 0,
          ms: timing.roll,
        });
      kept = [...kept, ...roll.set_aside.map((index) => roll.dice[index]!)];
      count += roll.matches;
    }
    const last = rolls.at(-1)!;
    const slots = allSlots(last.dice).filter((index) => !last.set_aside.includes(index));
    const leftover = slots.map((index) => last.dice[index]!);
    pegs = pegs.map((board, seat) =>
      seat === entry.player ? { ...board, [target]: board[target]! + movement } : board,
    );
    const shown = {
      ...base,
      pegs,
      dice: leftover,
      throwKey: throwKey(entry.turn, entry.continuation, rolls.length - 1),
      slots,
      setAside: [],
      hand: 0,
      kept,
      count,
      target,
    };
    scenes.push({ ...shown, message: strings.game.moves(target, movement), ms: timing.move });
    const following = turnLog[index + 1] ?? nextPosition;
    if (isContinuation(entry, following)) {
      const message = strings.game.continuation(target);
      scenes.push({
        ...shown,
        dice: [],
        slots: [],
        hand: opening.length,
        message,
        tone: "cue",
        ms: timing.continuation,
      });
    }
  });
  const observation = next.observation;
  const sequence = observation?.sequence;
  if (next.phase === "choosing_dice" && observation && sequence) {
    const name = next.names[observation.seat]!;
    scenes.push(
      readyScene({
        pegs,
        player: observation.seat,
        turn: observation.turn,
        hand: sequence.dice.length,
        kept: bowl(sequence.rolls, sequence.reset),
        count: sequence.matches,
        target: sequence.target,
        message: sequence.reset ? strings.game.reset : strings.game.throws(name),
      }),
    );
  }
  if (next.phase === "choosing_target" && observation) {
    const player = observation.seat;
    if (next.controllers[player] === "human") {
      scenes.push(
        readyScene({
          pegs,
          player,
          turn: observation.turn,
          hand: observation.opening_roll.length,
          kept: [],
          count: 0,
          target: null,
          message: strings.game.throws(next.names[player]!),
        }),
      );
    }
  }
  return scenes;
}
