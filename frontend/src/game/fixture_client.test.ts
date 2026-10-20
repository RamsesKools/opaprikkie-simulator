import { describe, expect, test } from "vitest";
import { createFixtureClient, scriptedGame, type Script } from "./fixture_client.ts";
import { GameError, type GameClient, type GameUpdate, type LogEntry } from "./model.ts";

const names: [string, string] = ["Ann", "Bob"];

async function playOut(client: GameClient, update: GameUpdate): Promise<LogEntry[]> {
  const logs = [...update.logs];
  let game = update.game;
  while (game.phase === "choosing_target") {
    const observation = game.observation!;
    expect(game.controllers[observation.seat]).toBe("human");
    const next = await client.chooseTarget(observation.legal_targets[0]!.target);
    logs.push(...next.logs);
    game = next.game;
  }
  expect(game.phase).toBe("finished");
  expect(game.observation).toBeNull();
  return logs;
}

describe("hot-seat", () => {
  test("starts with the dice-off and the winner's choice", async () => {
    const update = await createFixtureClient().start({ mode: "hot_seat", names });

    expect(update.logs.every((entry) => entry.kind === "dice_off")).toBe(true);
    expect(update.game).toMatchObject({
      ruleset: "classic",
      phase: "choosing_first_player",
      names,
      controllers: ["human", "human"],
      observation: { seat: 0 },
    });
  });

  test.each([0, 1])("plays to the end when seat %i starts", async (first) => {
    const client = createFixtureClient();
    await client.start({ mode: "hot_seat", names });
    const opening = await client.chooseFirstPlayer(first);

    expect(opening.game.observation?.seat).toBe(first);
    const logs = await playOut(client, opening);
    expect(logs.some((entry) => entry.kind === "no_move")).toBe(true);
  });

  test("rejects a target off the script", async () => {
    const client = createFixtureClient();
    await client.start({ mode: "hot_seat", names });
    const { game } = await client.chooseFirstPlayer(0);
    const off = game.observation!.legal_targets[0]!.target === 1 ? 2 : 1;

    await expect(client.chooseTarget(off)).rejects.toMatchObject({ code: "illegal_target" });
  });

  test("rejects a first player before the start or twice", async () => {
    const client = createFixtureClient();
    await expect(client.chooseFirstPlayer(0)).rejects.toBeInstanceOf(GameError);
    await client.start({ mode: "hot_seat", names });
    await client.chooseFirstPlayer(0);
    await expect(client.chooseFirstPlayer(1)).rejects.toMatchObject({ code: "wrong_phase" });
  });
});

describe("versus AI", () => {
  test("plays the AI's turns within each response", async () => {
    const client = createFixtureClient();
    await client.start({ mode: "versus_ai", names });
    const opening = await client.chooseFirstPlayer(1);

    expect(opening.logs.some((entry) => "player" in entry && entry.player === 1)).toBe(true);
    const logs = await playOut(client, opening);
    expect(logs.filter((entry) => entry.kind === "roll_sequence").length).toBe(
      scriptedGame.branches[1]!.steps.length,
    );
  });

  test("lets an AI dice-off winner start by itself", async () => {
    const choice = scriptedGame.first_player_choice;
    const script: Script = {
      ...scriptedGame,
      first_player_choice: { ...choice, observation: { ...choice.observation!, seat: 1 } },
    };
    const update = await createFixtureClient(script).start({ mode: "versus_ai", names });

    expect(update.game.phase).toBe("choosing_target");
    expect(update.game.observation?.seat).toBe(0);
    expect(update.logs.some((entry) => entry.kind === "roll_sequence")).toBe(true);
  });
});
