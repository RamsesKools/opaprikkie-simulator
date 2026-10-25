import type { TakeOutcome } from "../game/model.ts";
import type { ColourId } from "./palette.ts";

type Section = { heading: string; text: string };

/** Every string the player reads; each language is one dictionary of this type. */
export type Strings = {
  title: string;
  rules: string;
  newGame: string;
  language: string;
  play: {
    label: string;
    withoutHints: string;
    withHints: string;
    automatic: string;
    help: string;
    helpLabel: string;
    helpTitle: string;
    helpModes: Section[];
  };
  close: string;
  stale: string;
  reload: string;
  menu: {
    mode: string;
    hotSeat: string;
    versusAi: string;
    player: (seat: number) => string;
    you: string;
    opponent: string;
    defaultAiName: string;
    colourOf: (who: string) => string;
    colours: Record<ColourId, string>;
    colourTaken: (colour: string) => string;
    start: string;
    nameLength: string;
    dev: string;
    seed: string;
    strategy: string;
    randomStrategy: string;
  };
  diceOff: {
    title: string;
    explain: string;
    tie: (names: string[]) => string;
    wins: (name: string) => string;
    whoStarts: string;
    starts: (name: string) => string;
    aiStarts: (name: string) => string;
  };
  game: {
    turn: (turn: number, name: string) => string;
    pick: (name: string) => string;
    selectDice: (name: string, hints: boolean) => string;
    takeMore: (name: string, target: number) => string;
    /** With hints, the opening roll's buttons, one per take the selection fits. */
    choose: (matches: number, target: number) => string;
    chooseNext: (outcome: TakeOutcome, dice: number) => string;
    /** The button that takes the selection, saying what happens next. */
    next: (outcome: TakeOutcome, dice: number, target: number) => string;
    endTurn: string;
    throwPrompt: (name: string) => string;
    throws: (name: string) => string;
    aiThinking: (name: string) => string;
    goesFor: (name: string, target: number) => string;
    reset: string;
    moves: (target: number, movement: number) => string;
    saved: (count: number, target: number) => string;
    kept: (values: number[]) => string;
    continuation: (target: number) => string;
    ohNo: (name: string, human: boolean) => string;
    board: (name: string) => string;
    column: (target: number, row: number) => string;
    dice: (values: number[]) => string;
    die: (value: number) => string;
    stack: (count: number) => string;
    throwStack: (count: number) => string;
    throwDice: string;
    combo: (throws: number) => string;
    noMore: (
      name: string,
      human: boolean,
      target: number,
      count: number,
      movement: number,
    ) => string;
    ended: (
      name: string,
      human: boolean,
      target: number,
      count: number,
      movement: number,
    ) => string;
    skipPopup: string;
    seed: (seed: number | string) => string;
    strategy: (strategy: string) => string;
  };
  errors: {
    generic: string;
    network: string;
    lost: string;
    wrongPhase: string;
    illegalTarget: {
      /** The sequence is locked to this target. */
      locked: (target: number) => string;
      notATarget: string;
      topped: string;
      noMatch: string;
      other: string;
    };
    illegalDice: {
      empty: string;
      noMatch: string;
      notDice: string;
      other: string;
    };
  };
  victory: {
    wins: (name: string) => string;
    again: string;
    turns: (turns: number) => string;
    dice: string;
    chart: (name: string, counts: number[]) => string;
  };
  booklet: { title: string; sections: Section[] };
};
