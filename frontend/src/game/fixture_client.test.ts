import { describe, expect, test } from "vitest";
import { createFixtureClient, scriptedGame, type Script } from "./fixture_client.ts";
import type { GameClient, LogEntry, Update } from "./model.ts";

const names: [string, string] = ["Ann", "Bob"];

async function playOut(client: GameClient, update: Update): Promise<LogEntry[]> {
  const log = [...update.log];
  let state = update.state;
  while (state.phase === "choosing_target") {
    expect(state.controllers[state.current_player!]).toBe("human");
    const next = await client.chooseTarget(state.legal_targets[0]!.target);
    log.push(...next.log);
    state = next.state;
  }
  expect(state.phase).toBe("finished");
  return log;
}

describe("hot-seat", () => {
  test("starts with the dice-off and the winner's choice", async () => {
    const update = await createFixtureClient().start({ mode: "hot_seat", names });

    expect(update.log.every((entry) => entry.kind === "dice_off")).toBe(true);
    expect(update.state).toMatchObject({
      phase: "choosing_first_player",
      names,
      controllers: ["human", "human"],
      current_player: 0,
    });
  });

  test.each([0, 1])("plays to the end when seat %i starts", async (first) => {
    const client = createFixtureClient();
    await client.start({ mode: "hot_seat", names });
    const opening = await client.chooseFirstPlayer(first);

    expect(opening.state.current_player).toBe(first);
    const log = await playOut(client, opening);
    expect(log.some((entry) => entry.kind === "no_move")).toBe(true);
  });

  test("rejects a target off the script", async () => {
    const client = createFixtureClient();
    await client.start({ mode: "hot_seat", names });
    const { state } = await client.chooseFirstPlayer(0);
    const off = state.legal_targets[0]!.target === 1 ? 2 : 1;

    await expect(client.chooseTarget(off)).rejects.toThrow("not scripted");
  });

  test("rejects a first player before the start or twice", async () => {
    const client = createFixtureClient();
    await expect(client.chooseFirstPlayer(0)).rejects.toThrow("wrong phase");
    await client.start({ mode: "hot_seat", names });
    await client.chooseFirstPlayer(0);
    await expect(client.chooseFirstPlayer(1)).rejects.toThrow("wrong phase");
  });
});

describe("versus AI", () => {
  test("plays the AI's turns within each response", async () => {
    const client = createFixtureClient();
    await client.start({ mode: "versus_ai", names });
    const opening = await client.chooseFirstPlayer(1);

    expect(opening.log.some((entry) => "player" in entry && entry.player === 1)).toBe(true);
    const log = await playOut(client, opening);
    expect(log.filter((entry) => entry.kind === "roll_sequence").length).toBe(
      scriptedGame.branches[1]!.steps.length,
    );
  });

  test("lets an AI dice-off winner start by itself", async () => {
    const script: Script = {
      ...scriptedGame,
      first_player_choice: { ...scriptedGame.first_player_choice, current_player: 1 },
    };
    const update = await createFixtureClient(script).start({ mode: "versus_ai", names });

    expect(update.state.phase).toBe("choosing_target");
    expect(update.state.current_player).toBe(0);
    expect(update.log.some((entry) => entry.kind === "roll_sequence")).toBe(true);
  });
});
