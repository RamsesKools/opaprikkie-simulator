import { expect, inject, test } from "vitest";
import { createApiClient } from "../../src/game/api_client.ts";
import type { GameClient, GameSetup, GameUpdate, LogEntry } from "../../src/game/model.ts";
import { version } from "../../src/lib/version.ts";

declare module "vitest" {
  export interface ProvidedContext {
    backendUrl: string;
  }
}

type Jar = { cookie: string | null };

// Node's fetch keeps no cookies, so each jar stands in for one browser.
function browser(jar: Jar = { cookie: null }): GameClient {
  const fetch = async (request: Request) => {
    if (jar.cookie) request.headers.set("cookie", jar.cookie);
    const response = await globalThis.fetch(request);
    const cookie = response.headers.get("set-cookie");
    if (cookie) jar.cookie = cookie.split(";")[0]!;
    return response;
  };
  return createApiClient({ baseUrl: inject("backendUrl"), fetch });
}

async function playToTheEnd(client: GameClient, update: GameUpdate) {
  const logs: LogEntry[] = [...update.logs];
  let { game } = update;
  if (game.phase === "choosing_first_player") {
    ({ game } = await client.chooseFirstPlayer(game.observation!.seat));
  }
  while (game.phase === "choosing_target") {
    expect(game.controllers[game.observation!.seat]).toBe("human");
    const next = await client.chooseTarget(game.observation!.legal_targets[0]!.target);
    logs.push(...next.logs);
    game = next.game;
  }
  return { game, logs };
}

const hotSeat: GameSetup = { mode: "hot_seat", names: ["Ann", "Bob"], seed: "contract" };

test("shakes hands with this build's version in dev mode", async () => {
  const health = await browser().health();

  expect(health).toMatchObject({ version, dev_mode: true });
  expect(health.strategies).not.toHaveLength(0);
});

test("creates a session without names or a game", async () => {
  expect(await browser().session()).toEqual({ names: null, game: null });
});

test("plays a hot-seat game to the end", async () => {
  const client = browser();
  await client.session();
  const started = await client.start(hotSeat);

  expect(started.game).toMatchObject({ phase: "choosing_first_player", names: hotSeat.names });
  expect(started.logs[0]!.kind).toBe("dice_off");
  const { game, logs } = await playToTheEnd(client, started);

  expect(game).toMatchObject({ phase: "finished", observation: null, seed: "contract" });
  expect(game.winner).not.toBeNull();
  expect(logs.some((entry) => entry.kind === "roll_sequence")).toBe(true);
});

test("counts the turns and each player's dice in the game", async () => {
  const client = browser();
  await client.session();
  const started = await client.start(hotSeat);
  expect(started.game).toMatchObject({
    turns: 0,
    dice_counts: [Array(6).fill(0), Array(6).fill(0)],
  });

  const { game, logs } = await playToTheEnd(client, started);

  const thrown = [Array(6).fill(0), Array(6).fill(0)];
  for (const entry of logs) {
    if (entry.kind === "dice_off") continue;
    const throws = entry.kind === "no_move" ? [entry.opening_roll] : entry.rolls.map((r) => r.dice);
    for (const die of throws.flat()) thrown[entry.player]![die - 1]++;
  }
  expect(game.dice_counts).toEqual(thrown);
  expect(game.turns).toBe(
    logs.filter((entry) => entry.kind !== "dice_off" && entry.continuation === 0).length,
  );
});

test("plays a game versus the AI to the end, with its turns in the logs", async () => {
  const client = browser();
  const { strategies } = await client.health();
  const strategy = strategies![0]!;
  const started = await client.start({ mode: "versus_ai", names: ["Ann", "Opa"], strategy });

  expect(started.game).toMatchObject({ controllers: ["human", "ai"], strategy });
  const { game, logs } = await playToTheEnd(client, started);

  expect(game.phase).toBe("finished");
  expect(logs.some((entry) => entry.kind !== "dice_off" && entry.player === 1)).toBe(true);
});

test("rejects an illegal target and a choice out of phase", async () => {
  const client = browser();
  const { game } = await client.start(hotSeat);

  await expect(client.chooseTarget(1)).rejects.toMatchObject({ code: "wrong_phase" });
  const opened = await client.chooseFirstPlayer(game.observation!.seat);
  const legal = opened.game.observation!.legal_targets.map(({ target }) => target);
  const illegal = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].find((target) => !legal.includes(target));

  await expect(client.chooseTarget(illegal ?? 13)).rejects.toMatchObject({
    code: "illegal_target",
  });
});

test("plays a manual turn: takes fewer matches than rolled, then stops", async () => {
  const client = browser();
  for (let seed = 0; seed < 50; seed++) {
    const { game } = await client.start({ ...hotSeat, seed: `manual-${seed}` });
    const opened = await client.chooseFirstPlayer(game.observation!.seat);
    const single = opened.game.observation!.legal_targets.find(({ target }) => target <= 6);
    if (!single) continue;
    const first = single.set_aside.slice(0, 1);
    expect(opened.game.observation!.takes).toContainEqual({
      target: single.target,
      dice: first,
      matches: 1,
      row: 1,
      outcome: "throw",
      next_dice: 5,
    });
    await expect(client.stop()).rejects.toMatchObject({ code: "wrong_phase" });

    const taken = await client.take(single.target, first);
    if (taken.game.phase !== "choosing_dice") continue;
    expect(taken.logs).toEqual([]);
    expect(taken.game.observation!.sequence).toMatchObject({ target: single.target, matches: 1 });
    const takes = taken.game.observation!.takes;
    expect(takes.length).toBeGreaterThan(0);
    expect(takes.every(({ target, row }) => target === single.target && row >= 2)).toBe(true);
    const everyDie = takes.filter(
      ({ dice }) => dice.length === taken.game.observation!.sequence!.dice.length,
    );
    expect(everyDie.every(({ outcome }) => outcome === "reset" || outcome === "topped")).toBe(true);
    const stopped = await client.stop();

    expect(stopped.logs[0]).toMatchObject({ kind: "roll_sequence", matches: 1, movement: 1 });
    return;
  }
  throw new Error("no seed with a manual sequence that goes on");
});

test("resumes the session and its game from the cookie", async () => {
  const jar: Jar = { cookie: null };
  const { game } = await browser(jar).start(hotSeat);

  const resumed = await browser(jar).session();

  expect(resumed.names).toEqual(hotSeat.names);
  expect(resumed.game).toEqual(game);
  expect(await browser().session()).toEqual({ names: null, game: null });
});

test("rejects a game action without a session", async () => {
  await expect(browser().chooseTarget(7)).rejects.toMatchObject({ code: "no_session" });
});

test("changes the play mode of a game without moving it on", async () => {
  const client = browser();
  await client.session();
  const started = await client.start({ ...hotSeat, playMode: "with_hints" });

  const changed = await client.setPlayMode("automatic");

  expect(changed.logs).toEqual([]);
  expect(changed.game).toEqual(started.game);
});
