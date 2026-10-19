export const TOP_ROW = 5;

export type Phase = "naming" | "choosing_first_player" | "choosing_target" | "finished";
export type Controller = "human" | "ai";
export type Mode = "hot_seat" | "versus_ai";

export type Pegs = Record<number, number>;

export type LegalTarget = { target: number; matches: number; guaranteed_moves: number };

export type Observation = {
  ruleset: string;
  seat: number;
  pegs: Pegs[];
  opening_roll: number[];
  legal_targets: LegalTarget[];
  turn: number;
  continuation: number;
};

export type Game = {
  ruleset: string;
  phase: Phase;
  names: string[];
  controllers: Controller[];
  pegs: Pegs[];
  observation: Observation | null;
  winner: number | null;
  seed: number | string | null;
  strategy: string | null;
};

export type DiceOffRound = {
  kind: "dice_off";
  rolls: { player: number; dice: number[] }[];
};

export type Roll = { dice: number[]; set_aside: number[]; reset: boolean };

export type RollSequence = {
  kind: "roll_sequence";
  player: number;
  turn: number;
  continuation: number;
  target: number;
  rolls: Roll[];
  matches: number;
  movement: number;
};

export type NoMove = {
  kind: "no_move";
  player: number;
  turn: number;
  continuation: number;
  opening_roll: number[];
};

export type LogEntry = DiceOffRound | RollSequence | NoMove;

export type GameUpdate = { game: Game; logs: LogEntry[] };

export type GameSetup = { mode: Mode; names: [string, string] };

export class GameError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

// Mirrors the backend's game routes; failures reject with a GameError.
export interface GameClient {
  /** Creates the game and names the players; the logs include the dice-off. */
  start(setup: GameSetup): Promise<GameUpdate>;
  chooseFirstPlayer(player: number): Promise<GameUpdate>;
  chooseTarget(target: number): Promise<GameUpdate>;
}
