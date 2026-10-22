import { version } from "../lib/version.ts";
import recorded from "./fixtures/scripted_game.json";
import {
  GameError,
  type Controller,
  type DiceOffRound,
  type Game,
  type GameClient,
  type GameSetup,
  type GameUpdate,
  type LogEntry,
} from "./model.ts";

type ScriptGame = Omit<Game, "names" | "controllers">;

type Branch = {
  logs: LogEntry[];
  steps: { game: ScriptGame; target: number; logs: LogEntry[] }[];
  final: ScriptGame;
};

export type Script = {
  dice_off: DiceOffRound[];
  first_player_choice: ScriptGame;
  branches: Branch[];
};

// Recorded from the engine with seed "fixture-241", always picking the most guaranteed moves.
// One branch per first player; each choice point offers only the recorded target.
// Drives the screens in tests without a backend.
export const scriptedGame = recorded as Script;

export function createFixtureClient(script: Script = scriptedGame): GameClient {
  let names: string[] = [];
  let controllers: Controller[] = [];
  let branch: Branch | null = null;
  let cursor = 0;

  const current = (): ScriptGame =>
    branch ? (branch.steps[cursor]?.game ?? branch.final) : script.first_player_choice;

  function pickFirst(player: number): LogEntry[] {
    const picked = script.branches[player];
    if (!picked || branch || names.length === 0) {
      throw new GameError("wrong_phase", "no first player to choose");
    }
    branch = picked;
    cursor = 0;
    return [...picked.logs];
  }

  function pickTarget(target: number): LogEntry[] {
    const step = branch?.steps[cursor];
    if (!step || step.target !== target) {
      throw new GameError("illegal_target", `target ${target} is not scripted`);
    }
    cursor += 1;
    return [...step.logs];
  }

  function respond(logs: LogEntry[]): GameUpdate {
    for (;;) {
      const game = current();
      const seat = game.observation?.seat;
      if (seat === undefined || controllers[seat] !== "ai") {
        return { game: { ...game, names: [...names], controllers: [...controllers] }, logs };
      }
      logs.push(
        ...(game.phase === "choosing_first_player"
          ? pickFirst(seat)
          : pickTarget(branch!.steps[cursor]!.target)),
      );
    }
  }

  return {
    health: async () => ({ version, dev_mode: false, strategies: null }),
    session: async () => ({ names: null, game: null }),
    start: async ({ mode, names: chosen }: GameSetup) => {
      names = [...chosen];
      controllers = ["human", mode === "versus_ai" ? "ai" : "human"];
      branch = null;
      cursor = 0;
      return respond([...script.dice_off]);
    },
    chooseFirstPlayer: async (player) => respond(pickFirst(player)),
    chooseTarget: async (target) => respond(pickTarget(target)),
    take: async () => {
      throw new GameError("illegal_dice", "manual turns are not scripted");
    },
    stop: async () => {
      throw new GameError("wrong_phase", "manual turns are not scripted");
    },
    setPlayMode: async () => respond([]),
  };
}
