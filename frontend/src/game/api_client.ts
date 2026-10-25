import createClient from "openapi-fetch";
import type { paths } from "../lib/api.d.ts";
import { timing } from "./timing.ts";
import { GameError, type Controller, type GameClient, type GameSetup } from "./model.ts";

type Options = { baseUrl?: string; fetch?: (request: Request) => Promise<Response> };

type Result<T> = { data?: T; error?: unknown; response: Response };

async function call<T>(request: Promise<Result<T>>): Promise<T> {
  let result: Result<T>;
  try {
    result = await request;
  } catch (cause) {
    throw new GameError("network", cause instanceof Error ? cause.message : String(cause));
  }
  const { data, error, response } = result;
  if (error === undefined) return data as T;
  if (typeof error === "object" && error !== null && "code" in error) {
    const { code, message, reason, legal_targets } = error as {
      code: string;
      message?: string;
      reason?: string;
      legal_targets?: number[];
    };
    throw new GameError(code, message ?? code, { reason, legalTargets: legal_targets });
  }
  throw new GameError("http_error", `HTTP ${response.status}`);
}

/** Aborts the request after the cap; a stalled one then fails as a network error. */
async function capped<T>(
  request: (signal: AbortSignal) => Promise<Result<T>>,
  ms: number,
): Promise<T> {
  const abort = new AbortController();
  const cap = setTimeout(() => abort.abort(new Error("Request timed out")), ms);
  try {
    return await call(request(abort.signal));
  } finally {
    clearTimeout(cap);
  }
}

const isNoSession = (error: unknown) => error instanceof GameError && error.code === "no_session";

export function createApiClient(options: Options = {}): GameClient {
  const api = createClient<paths>(options);
  const createSession = () => call(api.POST("/api/sessions"));
  const createSessionCapped = () =>
    capped((signal) => api.POST("/api/sessions", { signal }), timing.sessionCap);

  async function withSession<T>(action: () => Promise<T>): Promise<T> {
    try {
      return await action();
    } catch (error) {
      if (!isNoSession(error)) throw error;
      await createSession();
      return action();
    }
  }

  return {
    health: () => call(api.GET("/api/health")),
    session: async () => {
      try {
        return await capped((signal) => api.GET("/api/session", { signal }), timing.sessionCap);
      } catch (error) {
        if (!isNoSession(error)) throw error;
        return createSessionCapped();
      }
    },
    start: async ({ mode, names, playMode, seed, strategy }: GameSetup) => {
      const controllers: Controller[] = ["human", mode === "versus_ai" ? "ai" : "human"];
      const body = {
        controllers,
        ...(playMode === undefined ? {} : { play_mode: playMode }),
        ...(seed === undefined ? {} : { seed }),
        ...(strategy === undefined ? {} : { strategy }),
      };
      const created = await withSession(() => call(api.POST("/api/game", { body })));
      const named = await call(api.POST("/api/game/names", { body: { names } }));
      return { game: named.game, logs: [...created.logs, ...named.logs] };
    },
    chooseFirstPlayer: (player) => call(api.POST("/api/game/first_player", { body: { player } })),
    chooseTarget: (target) => call(api.POST("/api/game/target", { body: { target } })),
    take: (target, dice) => call(api.POST("/api/game/take", { body: { target, dice } })),
    stop: () => call(api.POST("/api/game/stop")),
    setPlayMode: (playMode) =>
      call(api.POST("/api/game/play_mode", { body: { play_mode: playMode } })),
  };
}
