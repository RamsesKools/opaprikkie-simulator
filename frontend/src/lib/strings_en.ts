import type { TakeOutcome } from "../game/model.ts";
import type { Strings } from "./strings.ts";

const dice = (count: number) => (count === 1 ? "die" : "dice");

const nextStep: Record<TakeOutcome, (dice: number, target: number) => string> = {
  throw: (count) => `Reroll ${count} ${dice(count)}`,
  reset: (_, target) => `Reroll all for more ${target}'s`,
  topped: () => "Finish peg and reroll all dice",
  ends: () => "Move peg and end turn",
  wins: () => "Finish peg and win",
};

const shortStep: Record<TakeOutcome, (dice: number) => string> = {
  throw: (count) => `Reroll ${count} ${dice(count)}`,
  reset: () => "Reroll all",
  topped: () => "Finish peg",
  ends: () => "End turn",
  wins: () => "Win!",
};

const steps = (count: number) => `${count} ${count === 1 ? "step" : "steps"}`;
const matches = (count: number, target: number) =>
  `${count} ${count === 1 ? "match" : "matches"} for ${target}`;
const summary = (name: string, human: boolean, count: number, target: number, movement: number) =>
  `${human ? "You" : name} took ${matches(count, target)}, ${human ? "your" : `${name}'s`} peg moves ${steps(movement)}.`;

export const en: Strings = {
  title: "Opa Prikkie",
  rules: "Rules",
  newGame: "New Game",
  language: "Language",
  play: {
    label: "How to play",
    withoutHints: "Play without hints",
    withHints: "Play with hints",
    automatic: "Play automatically",
    help: "?",
    helpLabel: "What the play modes mean",
    helpTitle: "Play modes",
    helpModes: [
      {
        heading: "Play without hints",
        text: "You pick the dice yourself. Nothing lights up until you select dice, so you have to spot the matches.",
      },
      {
        heading: "Play with hints",
        text: "You still pick the dice, but every column you can play lights up, and clicking one takes its most matches at once.",
      },
      {
        heading: "Play automatically",
        text: "You only pick the column. The game takes every match and rolls on for you.",
      },
    ],
  },
  close: "Close",
  stale: "A new version of Opa Prikkie is out.",
  reload: "Reload",
  menu: {
    mode: "Mode",
    hotSeat: "Player vs Player",
    versusAi: "Player vs AI",
    player: (seat) => `Player ${seat + 1}`,
    you: "Your name",
    opponent: "Opponent",
    defaultAiName: "Opa",
    colourOf: (who) => `Colour: ${who}`,
    colours: {
      red: "Red",
      orange: "Orange",
      pink: "Pink",
      purple: "Purple",
      blue: "Blue",
      cyan: "Cyan",
      slate: "Slate",
      maroon: "Maroon",
    },
    colourTaken: (colour) => `${colour} (taken by the other player)`,
    start: "Start",
    nameLength: "Names need 1 to 20 characters.",
    dev: "Dev mode",
    seed: "Seed",
    strategy: "AI strategy",
    randomStrategy: "Random",
  },
  diceOff: {
    title: "Dice-off",
    explain: "Each player throws two dice. The highest total chooses who starts.",
    tie: (names) => `It's a tie! ${names.join(" and ")} throw again.`,
    wins: (name) => `${name} wins the dice-off!`,
    whoStarts: "Who starts?",
    starts: (name) => `${name} starts`,
    aiStarts: (name) => `${name} wins the dice-off and starts.`,
  },
  game: {
    turn: (turn, name) => `Turn ${turn}: ${name}`,
    pick: (name) => `${name}, pick a target.`,
    selectDice: (name, hints) =>
      hints ? `${name}, select dice to take.` : `${name}, select dice, then click their column.`,
    takeMore: (name, target) => `${name}, take more for ${target} or end your turn.`,
    choose: (count, target) => `Choose ${count} x ${target}`,
    chooseNext: (outcome, count) => shortStep[outcome](count),
    next: (outcome, count, target) => nextStep[outcome](count, target),
    endTurn: "End turn",
    throwPrompt: (name) => `${name}, throw the dice!`,
    throws: (name) => `${name} throws the dice.`,
    aiThinking: (name) => `${name} is thinking...`,
    goesFor: (name, target) => `${name} goes for ${target}.`,
    reset: "Every die is set aside, so all six roll again!",
    moves: (target, movement) =>
      `Peg ${target} moves up ${movement} ${movement === 1 ? "row" : "rows"}.`,
    saved: matches,
    kept: (values) => (values.length ? `Kept: ${values.join(", ")}` : "Nothing kept"),
    continuation: (target) => `Peg ${target} is at the top, roll again!`,
    ohNo: (name, human) =>
      human
        ? "Oh no, you didn't roll any legal targets!"
        : `Oh no, ${name} didn't roll any legal targets.`,
    board: (name) => `${name}'s board`,
    column: (target, row) => `Target ${target}, row ${row}`,
    dice: (values) => `Dice: ${values.join(", ")}`,
    die: (value) => `Die ${value}`,
    stack: (count) => `${count} ${dice(count)} left to throw`,
    throwStack: (count) => `Throw dice, ${count} left`,
    throwDice: "Throw dice",
    combo: (throws) => `Combo x${throws}`,
    noMore: (name, human, target, count, movement) =>
      `No more ${target}s. ${summary(name, human, count, target, movement)}`,
    ended: (name, human, target, count, movement) =>
      `${human ? "You ended your turn" : `${name} ended the turn`}. ${summary(name, human, count, target, movement)}`,
    skipPopup: "Click to dismiss",
    seed: (seed) => `Seed: ${seed}`,
    strategy: (strategy) => `AI strategy: ${strategy}`,
  },
  errors: {
    generic: "Something went wrong.",
    network: "Can't reach the server. Check your connection and try again.",
    lost: "Your game was lost. Start a new one.",
    wrongPhase: "That doesn't work right now. The game has moved on.",
    illegalTarget: {
      locked: (target) => `This turn is locked to ${target}.`,
      notATarget: "That isn't a target.",
      topped: "That peg is already at the top.",
      noMatch: "You have no match for that target.",
      other: "That isn't a legal target.",
    },
    illegalDice: {
      empty: "Choose at least one match.",
      noMatch: "Not every chosen die is part of a match for that target.",
      notDice: "Choose the dice again.",
      other: "Those dice can't be taken.",
    },
  },
  victory: {
    wins: (name) => `${name} wins!`,
    again: "Play again",
    turns: (turns) => `The game took ${turns} ${turns === 1 ? "turn" : "turns"}.`,
    dice: "Dice thrown",
    chart: (name, counts) =>
      `${name}'s dice: ${counts.map((count, face) => `${face + 1} thrown ${count} times`).join(", ")}`,
  },
  booklet: {
    title: "How to play",
    sections: [
      {
        heading: "Goal",
        text: "Move all twelve of your pegs from the bottom to the top of your board. The game ends the moment one player tops their last peg, and that player wins.",
      },
      {
        heading: "Who starts",
        text: "Each player throws two dice. The highest total chooses who starts; on a tie, the tied players throw again.",
      },
      {
        heading: "Your turn",
        text: "You roll all six dice and pick one peg that matches. Then you keep rolling for that peg, or the game does it for you when turns play automatically. Playing by hand, you pick the dice to set aside: you may take fewer matches than you rolled, or end your turn after any roll, but you must take at least one match from your opening roll.",
      },
      {
        heading: "Matching",
        text: "Pegs 1 to 6 match a single die with that value. Pegs 7 to 12 match two dice that add up to the number, like 3 and 4 for peg 7.",
      },
      {
        heading: "Rolling on",
        text: "Matching dice are set aside and the rest roll again. When every die is set aside, all six roll again and the count carries on. The rolling stops when a roll has no match, when too few dice are left for a match, or when the peg reaches the top.",
      },
      {
        heading: "Moving",
        text: "Your peg moves up one row per match, until it reaches the top. Top a peg and you roll all six again for a new one.",
      },
      {
        heading: "Bad luck",
        text: "If a fresh roll of all six matches none of your pegs, your turn passes. That goes for a roll after topping a peg too.",
      },
    ],
  },
};
