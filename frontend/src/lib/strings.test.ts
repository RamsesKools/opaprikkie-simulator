import { expect, test } from "vitest";
import { dictionaries, languages } from "./language.ts";
import { en } from "./strings_en.ts";
import { nl } from "./strings_nl.ts";

const shape = (value: unknown): unknown => {
  if (typeof value === "function") return "function";
  if (Array.isArray(value)) return value.map(shape);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, shape(item)]));
  }
  return typeof value;
};

test("every language has a dictionary", () => {
  expect(Object.keys(dictionaries).toSorted()).toEqual([...languages].toSorted());
});

test("both dictionaries have the same shape, down to the number of rules sections", () => {
  expect(shape(nl)).toEqual(shape(en));
});

test("Dutch differs from English, apart from names that don't translate", () => {
  const same = ["title", "defaultAiName", "help", "seed", "start"];
  const walk = (dutch: unknown, english: unknown, path: string): string[] => {
    if (typeof dutch === "string") {
      return dutch === english && !same.some((key) => path.endsWith(key)) ? [path] : [];
    }
    if (typeof dutch !== "object" || dutch === null) return [];
    return Object.entries(dutch).flatMap(([key, item]) =>
      walk(item, (english as Record<string, unknown>)[key], `${path}.${key}`),
    );
  };

  expect(walk(nl, en, "strings")).toEqual([]);
});

test("English words the singular and plural forms", () => {
  expect(en.game.next("throw", 1, 3)).toBe("Reroll 1 die");
  expect(en.game.next("throw", 4, 3)).toBe("Reroll 4 dice");
  expect(en.game.moves(7, 1)).toBe("Peg 7 moves up 1 row.");
  expect(en.game.moves(7, 3)).toBe("Peg 7 moves up 3 rows.");
  expect(en.game.noMore("Opa", false, 10, 1, 1)).toBe(
    "No more 10s. Opa took 1 match for 10, Opa's peg moves 1 step.",
  );
  expect(en.game.stack(1)).toBe("1 die left to throw");
  expect(en.victory.turns(1)).toBe("The game took 1 turn.");
  expect(en.game.kept([])).toBe("Nothing kept");
});
