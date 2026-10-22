/** Steps in one roll sequence that count as a great turn, per lane; see docs/design_choices.md. */
export const greatCutoff: Record<number, number> = {
  1: 5,
  2: 5,
  3: 5,
  4: 5,
  5: 5,
  6: 5,
  7: 5,
  8: 5,
  9: 3,
  10: 3,
  11: 2,
  12: 2,
};

/** A peg that goes from the bottom to the top always counts, since no cutoff is above 5. */
export const isGreatTurn = (target: number, movement: number) =>
  movement >= (greatCutoff[target] ?? Infinity);
