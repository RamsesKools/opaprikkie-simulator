import { strings } from "./strings.ts";

const MAX_NAME = 20;

export function nameProblem(names: string[]): string | null {
  const valid = names.every((name) => name.trim().length > 0 && name.trim().length <= MAX_NAME);
  return valid ? null : strings.menu.nameLength;
}
