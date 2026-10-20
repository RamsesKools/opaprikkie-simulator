import { strings } from "../lib/strings.ts";
import { GameError } from "./model.ts";

const lostCodes = new Set(["no_session", "no_game"]);
const rejections = new Set(["wrong_phase", "illegal_target", "illegal_dice"]);

/** The session or its game is gone, so retrying can't help. */
export const isLost = (error: unknown) => error instanceof GameError && lostCodes.has(error.code);

export const isNetwork = (error: unknown) => error instanceof GameError && error.code === "network";

export function errorMessage(error: unknown): string {
  if (isLost(error)) return strings.errors.lost;
  if (isNetwork(error)) return strings.errors.network;
  // With hints off, the player learns the rules from the engine's rejections.
  if (error instanceof GameError && rejections.has(error.code)) {
    return `${error.message.charAt(0).toUpperCase()}${error.message.slice(1)}.`;
  }
  return strings.errors.generic;
}
