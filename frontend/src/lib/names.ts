import { strings } from "./strings.ts";

const MAX_NAME = 20;

export function nameProblem(names: string[]): string | null {
  const trimmed = names.map((name) => name.trim());
  if (trimmed.some((name) => name.length === 0 || name.length > MAX_NAME)) {
    return strings.menu.nameLength;
  }
  const folded = new Set(trimmed.map((name) => name.toLowerCase()));
  return folded.size < trimmed.length ? strings.menu.nameDuplicate : null;
}
