export const TOP_ROW = 5;

export type Phase = "choosing_first_player" | "choosing_target" | "finished";
export type Controller = "human" | "ai";
export type Mode = "hot_seat" | "versus_ai";

export type Pegs = Record<number, number>;

export type LegalTarget = { target: number; matches: number; guaranteed_moves: number };

export type GameView = {
  phase: Phase;
  names: string[];
  controllers: Controller[];
  pegs: Pegs[];
  current_player: number | null;
  opening_roll: number[];
  legal_targets: LegalTarget[];
  turn: number;
  continuation: number;
  winner: number | null;
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

export type Update = { state: GameView; log: LogEntry[] };

export type GameSetup = { mode: Mode; names: [string, string] };

export interface GameClient {
  start(setup: GameSetup): Promise<Update>;
  chooseFirstPlayer(player: number): Promise<Update>;
  chooseTarget(target: number): Promise<Update>;
}
