import { strings } from "../lib/strings.ts";
import { GameError } from "./model.ts";

const lostCodes = new Set(["no_session", "no_game"]);

/** The session or its game is gone, so retrying can't help. */
export const isLost = (error: unknown) => error instanceof GameError && lostCodes.has(error.code);

export function errorMessage(error: unknown): string {
  if (isLost(error)) return strings.errors.lost;
  if (error instanceof GameError && error.code === "network") return strings.errors.network;
  return strings.errors.generic;
}
