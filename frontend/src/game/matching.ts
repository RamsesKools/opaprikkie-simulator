const PAIR_TARGETS = 7;

/** How many matches for `target` the dice make, or 0 unless every die is part of one. */
export function takeMatches(target: number, dice: number[]): number {
  if (dice.length === 0) return 0;
  if (target < PAIR_TARGETS) return dice.every((value) => value === target) ? dice.length : 0;
  const count = (value: number) => dice.filter((die) => die === value).length;
  const paired = dice.every((value) =>
    value * 2 === target ? count(value) % 2 === 0 : count(value) === count(target - value),
  );
  return paired ? dice.length / 2 : 0;
}
