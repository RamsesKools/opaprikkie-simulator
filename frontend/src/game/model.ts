import type { components } from "../lib/api.d.ts";

type Schemas = components["schemas"];

export const TOP_ROW = 5;

export type Phase = Schemas["Phase"];
export type Controller = Schemas["Controller"];
export type Mode = "hot_seat" | "versus_ai";
/** How human turns play: by hand without or with hints, or automatically with hints. */
export type PlayMode = "without_hints" | "with_hints" | "automatic";

export type Pegs = Schemas["Game"]["pegs"][number];
export type LegalTarget = Schemas["LegalTarget"];
export type Observation = Schemas["Observation"];
export type SequenceInProgress = Schemas["SequenceInProgress"];
export type TakeOption = Schemas["TakeOption"];
export type TakeOutcome = Schemas["TakeOutcome"];
export type Game = Schemas["Game"];
export type DiceOffRound = Schemas["DiceOffRound"];
export type Roll = Schemas["Roll"];
export type RollSequence = Schemas["RollSequence"];
export type NoMove = Schemas["NoMove"];
export type LogEntry = Schemas["LogEntry"];
export type GameUpdate = Schemas["GameUpdate"];
export type Health = Schemas["Health"];
export type Session = Schemas["Session"];

/** Every peg back on the bottom row, as at the start of a game. */
export const emptyPegs = (pegs: Pegs[]): Pegs[] =>
  pegs.map((board) => Object.fromEntries(Object.keys(board).map((target) => [target, 0])));

/** `seed` and `strategy` are accepted in dev mode only. */
export type GameSetup = {
  mode: Mode;
  names: [string, string];
  seed?: string;
  strategy?: string;
};

export class GameError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Mirrors the backend's routes; failures reject with a GameError.
export interface GameClient {
  health(): Promise<Health>;
  /** Resumes the session from its cookie, or starts one. */
  session(): Promise<Session>;
  /** Creates the game and names the players; the logs include the dice-off. */
  start(setup: GameSetup): Promise<GameUpdate>;
  chooseFirstPlayer(player: number): Promise<GameUpdate>;
  chooseTarget(target: number): Promise<GameUpdate>;
  /** Sets aside the dice at these places in the throw for `target`, then throws the rest. */
  take(target: number, dice: number[]): Promise<GameUpdate>;
  stop(): Promise<GameUpdate>;
}
