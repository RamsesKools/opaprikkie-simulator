import type { Strings } from "../lib/strings.ts";
import { GameError } from "./model.ts";

const lostCodes = new Set(["no_session", "no_game"]);

/** The session or its game is gone, so retrying can't help. */
export const isLost = (error: unknown) => error instanceof GameError && lostCodes.has(error.code);

export const isNetwork = (error: unknown) => error instanceof GameError && error.code === "network";

function rejection({ errors }: Strings, { code, rejected }: GameError): string | null {
  const { reason, legalTargets } = rejected;
  switch (code) {
    case "wrong_phase":
      return errors.wrongPhase;
    case "illegal_target": {
      const messages = errors.illegalTarget;
      if (reason === "locked" && legalTargets?.length === 1)
        return messages.locked(legalTargets[0]!);
      if (reason === "not_a_target") return messages.notATarget;
      if (reason === "topped") return messages.topped;
      if (reason === "no_match") return messages.noMatch;
      return messages.other;
    }
    case "illegal_dice": {
      const messages = errors.illegalDice;
      if (reason === "empty") return messages.empty;
      if (reason === "no_match") return messages.noMatch;
      if (reason === "not_dice") return messages.notDice;
      return messages.other;
    }
    default:
      return null;
  }
}

export function errorMessage(error: unknown, strings: Strings): string {
  if (isLost(error)) return strings.errors.lost;
  if (isNetwork(error)) return strings.errors.network;
  if (error instanceof GameError) return rejection(strings, error) ?? strings.errors.generic;
  return strings.errors.generic;
}
