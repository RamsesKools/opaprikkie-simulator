import type {
  Controller,
  DiceOffRound,
  GameClient,
  GameSetup,
  GameView,
  LogEntry,
  Update,
} from "./model.ts";
import recorded from "./fixtures/scripted_game.json";

type ScriptState = Omit<GameView, "names" | "controllers">;

type Branch = {
  log: LogEntry[];
  steps: { state: ScriptState; target: number; log: LogEntry[] }[];
  final: ScriptState;
};

export type Script = {
  dice_off: DiceOffRound[];
  first_player_choice: ScriptState;
  branches: Branch[];
};

// Recorded from the engine with seed "fixture-241", always picking the most guaranteed moves.
// One branch per first player; each choice point offers only the recorded target.
export const scriptedGame = recorded as Script;

export function createFixtureClient(script: Script = scriptedGame): GameClient {
  let names: string[] = [];
  let controllers: Controller[] = [];
  let branch: Branch | null = null;
  let cursor = 0;

  const current = (): ScriptState =>
    branch ? (branch.steps[cursor]?.state ?? branch.final) : script.first_player_choice;

  function pickFirst(player: number): LogEntry[] {
    const picked = script.branches[player];
    if (!picked || branch || names.length === 0) throw new Error("wrong phase");
    branch = picked;
    cursor = 0;
    return [...picked.log];
  }

  function pickTarget(target: number): LogEntry[] {
    const step = branch?.steps[cursor];
    if (!step || step.target !== target) throw new Error(`target ${target} is not scripted`);
    cursor += 1;
    return [...step.log];
  }

  function respond(log: LogEntry[]): Update {
    for (;;) {
      const state = current();
      const seat = state.current_player;
      if (state.phase === "finished" || seat === null || controllers[seat] !== "ai") {
        return { state: { ...state, names: [...names], controllers: [...controllers] }, log };
      }
      log.push(
        ...(state.phase === "choosing_first_player"
          ? pickFirst(seat)
          : pickTarget(branch!.steps[cursor]!.target)),
      );
    }
  }

  return {
    start: async ({ mode, names: chosen }: GameSetup) => {
      names = [...chosen];
      controllers = ["human", mode === "versus_ai" ? "ai" : "human"];
      branch = null;
      cursor = 0;
      return respond([...script.dice_off]);
    },
    chooseFirstPlayer: async (player) => respond(pickFirst(player)),
    chooseTarget: async (target) => respond(pickTarget(target)),
  };
}
