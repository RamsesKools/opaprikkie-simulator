import { afterEach, describe, expect, test, vi } from "vitest";
import { createApiClient } from "./api_client.ts";
import { timing } from "./timing.ts";
import { GameError, type Game, type GameUpdate } from "./model.ts";

type Reply = { status: number; body: unknown };
type Route = (body: unknown) => Reply;

const game = (phase: Game["phase"]): Game => ({
  ruleset: "classic",
  phase,
  names: ["Ann", "Opa"],
  controllers: ["human", "ai"],
  pegs: [{ 1: 0 }, { 1: 0 }],
  turns: 0,
  dice_counts: [
    [0, 0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0, 0],
  ],
  observation: null,
  winner: null,
  seed: null,
  strategy: null,
});

const update = (phase: Game["phase"], kinds: string[] = []): GameUpdate =>
  ({
    game: game(phase),
    logs: kinds.map((kind) => ({ kind, player: 0, turn: 1, continuation: 0, opening_roll: [] })),
  }) as GameUpdate;

const failure = (status: number, code: string): Reply => ({
  status,
  body: { code, message: code },
});

function serve(routes: Record<string, Route | Reply[]>) {
  const calls: { route: string; body: unknown }[] = [];
  const fetch = vi.fn<(request: Request) => Promise<Response>>(async (request) => {
    const route = `${request.method} ${new URL(request.url).pathname}`;
    const text = await request.text();
    const body: unknown = text ? JSON.parse(text) : undefined;
    calls.push({ route, body });
    const handler = routes[route];
    const reply = Array.isArray(handler) ? handler.shift() : handler?.(body);
    if (!reply) throw new Error(`unexpected ${route}`);
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { "content-type": "application/json" },
    });
  });
  return { client: createApiClient({ baseUrl: "http://test", fetch }), calls };
}

test("reads the health", async () => {
  const health = { version: "1.0.0", dev_mode: true, strategies: ["greedy"] };
  const { client } = serve({ "GET /api/health": () => ({ status: 200, body: health }) });

  expect(await client.health()).toEqual(health);
});

test("resumes the session from its cookie", async () => {
  const session = { names: ["Ann", "Bob"], game: null };
  const { client, calls } = serve({ "GET /api/session": () => ({ status: 200, body: session }) });

  expect(await client.session()).toEqual(session);
  expect(calls).toHaveLength(1);
});

describe("a stalled session", () => {
  afterEach(() => vi.useRealTimers());

  const hangs = (request: Request) =>
    new Promise<Response>((_, reject) =>
      request.signal.addEventListener("abort", () => reject(request.signal.reason)),
    );

  async function outcome(promise: Promise<unknown>) {
    const result = promise.then(
      () => "resolved",
      (error: unknown) => (error instanceof GameError ? error.code : "other"),
    );
    await vi.advanceTimersByTimeAsync(timing.sessionCap - 1);
    const early = await Promise.race([result, Promise.resolve("pending")]);
    await vi.advanceTimersByTimeAsync(1);
    return { early, late: await result };
  }

  test("fails as a network error after the cap", async () => {
    vi.useFakeTimers();
    const client = createApiClient({ baseUrl: "http://test", fetch: hangs });

    expect(await outcome(client.session())).toEqual({ early: "pending", late: "network" });
  });

  test("fails the same way when creating the replacement session stalls", async () => {
    vi.useFakeTimers();
    const fetch = (request: Request) =>
      request.method === "GET"
        ? Promise.resolve(
            new Response(JSON.stringify({ code: "no_session", message: "no_session" }), {
              status: 401,
              headers: { "content-type": "application/json" },
            }),
          )
        : hangs(request);
    const client = createApiClient({ baseUrl: "http://test", fetch });

    expect(await outcome(client.session())).toEqual({ early: "pending", late: "network" });
  });

  test("leaves no timer behind once the session answered", async () => {
    vi.useFakeTimers();
    const { client } = serve({
      "GET /api/session": () => ({ status: 200, body: { names: null, game: null } }),
    });
    await client.session();

    expect(vi.getTimerCount()).toBe(0);
  });
});

test("starts a session when there is none", async () => {
  const { client, calls } = serve({
    "GET /api/session": () => failure(401, "no_session"),
    "POST /api/sessions": () => ({ status: 201, body: { names: null, game: null } }),
  });

  expect(await client.session()).toEqual({ names: null, game: null });
  expect(calls.map(({ route }) => route)).toEqual(["GET /api/session", "POST /api/sessions"]);
});

test("creates the game and names the players in one start", async () => {
  const { client, calls } = serve({
    "POST /api/game": () => ({ status: 201, body: update("naming") }),
    "POST /api/game/names": () => ({
      status: 200,
      body: update("choosing_target", ["dice_off", "no_move"]),
    }),
  });

  const started = await client.start({ mode: "versus_ai", names: ["Ann", "Opa"] });

  expect(started.game.phase).toBe("choosing_target");
  expect(started.logs.map(({ kind }) => kind)).toEqual(["dice_off", "no_move"]);
  expect(calls).toEqual([
    { route: "POST /api/game", body: { controllers: ["human", "ai"] } },
    { route: "POST /api/game/names", body: { names: ["Ann", "Opa"] } },
  ]);
});

test("sends the dev mode seed and strategy only when set", async () => {
  const { client, calls } = serve({
    "POST /api/game": () => ({ status: 201, body: update("naming") }),
    "POST /api/game/names": () => ({ status: 200, body: update("choosing_first_player") }),
  });

  await client.start({ mode: "hot_seat", names: ["Ann", "Bob"], seed: "7", strategy: "greedy" });

  expect(calls[0]!.body).toEqual({
    controllers: ["human", "human"],
    seed: "7",
    strategy: "greedy",
  });
});

test("starts a fresh session when the old one is gone", async () => {
  const { client, calls } = serve({
    "POST /api/game": [failure(401, "no_session"), { status: 201, body: update("naming") }],
    "POST /api/sessions": () => ({ status: 201, body: { names: null, game: null } }),
    "POST /api/game/names": () => ({ status: 200, body: update("choosing_first_player") }),
  });

  await client.start({ mode: "hot_seat", names: ["Ann", "Bob"] });

  expect(calls.map(({ route }) => route)).toEqual([
    "POST /api/game",
    "POST /api/sessions",
    "POST /api/game",
    "POST /api/game/names",
  ]);
});

test("posts the first player and the target", async () => {
  const { client, calls } = serve({
    "POST /api/game/first_player": () => ({ status: 200, body: update("choosing_target") }),
    "POST /api/game/target": () => ({ status: 200, body: update("finished", ["roll_sequence"]) }),
  });

  expect((await client.chooseFirstPlayer(1)).game.phase).toBe("choosing_target");
  expect((await client.chooseTarget(7)).logs).toHaveLength(1);
  expect(calls.map(({ body }) => body)).toEqual([{ player: 1 }, { target: 7 }]);
});

test("posts the dice to take and a stop", async () => {
  const { client, calls } = serve({
    "POST /api/game/take": () => ({ status: 200, body: update("choosing_dice") }),
    "POST /api/game/stop": () => ({
      status: 200,
      body: update("choosing_target", ["roll_sequence"]),
    }),
  });

  expect((await client.take(6, [0, 2])).game.phase).toBe("choosing_dice");
  expect((await client.stop()).logs).toHaveLength(1);
  expect(calls).toEqual([
    { route: "POST /api/game/take", body: { target: 6, dice: [0, 2] } },
    { route: "POST /api/game/stop", body: undefined },
  ]);
});

test("rejects with the API's error code", async () => {
  const { client } = serve({ "POST /api/game/target": () => failure(422, "illegal_target") });

  const rejection = client.chooseTarget(3);

  await expect(rejection).rejects.toBeInstanceOf(GameError);
  await expect(rejection).rejects.toMatchObject({ code: "illegal_target" });
});

test("carries a rejection's reason and legal targets", async () => {
  const { client } = serve({
    "POST /api/game/target": () => ({
      status: 422,
      body: { code: "illegal_target", message: "locked", reason: "locked", legal_targets: [7] },
    }),
  });

  await expect(client.chooseTarget(3)).rejects.toMatchObject({
    rejected: { reason: "locked", legalTargets: [7] },
  });
});

test("rejects with a generic code when the body isn't an API error", async () => {
  const { client } = serve({
    "POST /api/game/target": () => ({ status: 502, body: "Bad gateway" }),
  });

  await expect(client.chooseTarget(3)).rejects.toMatchObject({ code: "http_error" });
});

test("rejects with a network code when the request fails", async () => {
  const { client } = serve({});

  await expect(client.health()).rejects.toMatchObject({ code: "network" });
});

test("only starts a session for a missing one", async () => {
  const { client, calls } = serve({
    "GET /api/session": () => failure(500, "internal_error"),
    "POST /api/game": () => failure(422, "invalid_request"),
  });

  await expect(client.session()).rejects.toMatchObject({ code: "internal_error" });
  await expect(client.start({ mode: "hot_seat", names: ["A", "B"] })).rejects.toMatchObject({
    code: "invalid_request",
  });
  expect(calls.map(({ route }) => route)).toEqual(["GET /api/session", "POST /api/game"]);
});

test("sends the play mode with the new game only when set", async () => {
  const { client, calls } = serve({
    "POST /api/game": () => ({ status: 201, body: update("naming") }),
    "POST /api/game/names": () => ({ status: 200, body: update("choosing_first_player") }),
  });

  await client.start({ mode: "versus_ai", names: ["Ann", "Opa"], playMode: "with_hints" });

  expect(calls[0]!.body).toEqual({ controllers: ["human", "ai"], play_mode: "with_hints" });
});

test("changes the play mode of the game in play", async () => {
  const { client, calls } = serve({
    "POST /api/game/play_mode": () => ({ status: 200, body: update("choosing_target") }),
  });

  const changed = await client.setPlayMode("without_hints");

  expect(changed.game.phase).toBe("choosing_target");
  expect(changed.logs).toEqual([]);
  expect(calls).toEqual([
    { route: "POST /api/game/play_mode", body: { play_mode: "without_hints" } },
  ]);
});
