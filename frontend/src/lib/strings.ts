export const strings = {
  title: "Opa Prikkie",
  rules: "Rules",
  close: "Close",
  menu: {
    mode: "Mode",
    hotSeat: "Hot-seat",
    versusAi: "Versus AI",
    player: (seat: number) => `Player ${seat + 1}`,
    you: "Your name",
    opponent: "Opponent",
    defaultAiName: "Opa",
    start: "Start",
    nameLength: "Names need 1 to 20 characters.",
  },
  diceOff: {
    title: "Dice-off",
    explain: "Each player throws two dice. The highest total chooses who starts.",
    throw: "Throw",
    tie: (names: string[]) => `It's a tie! ${names.join(" and ")} throw again.`,
    wins: (name: string) => `${name} wins the dice-off!`,
    whoStarts: "Who starts?",
    starts: (name: string) => `${name} starts`,
    aiStarts: (name: string) => `${name} wins the dice-off and starts.`,
  },
  game: {
    turn: (turn: number, name: string) => `Turn ${turn}: ${name}`,
    pick: (name: string) => `${name}, pick a target.`,
    aiThinking: (name: string) => `${name} is thinking...`,
    goesFor: (name: string, target: number) => `${name} goes for ${target}.`,
    reset: "Every die is set aside, so all six roll again!",
    moves: (target: number, movement: number) =>
      `Peg ${target} moves up ${movement} ${movement === 1 ? "row" : "rows"}.`,
    continuation: (target: number) => `Peg ${target} is at the top, roll again!`,
    ohNo: (name: string, human: boolean) =>
      human
        ? "Oh no, you didn't roll any legal targets!"
        : `Oh no, ${name} didn't roll any legal targets.`,
    board: (name: string) => `${name}'s board`,
    column: (target: number, row: number) => `Target ${target}, row ${row}`,
    dice: (values: number[]) => `Dice: ${values.join(", ")}`,
    error: "Something went wrong.",
  },
  victory: {
    wins: (name: string) => `${name} wins!`,
    again: "Play again",
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
        text: "You roll all six dice and pick one peg that matches. The game keeps rolling for that peg by itself.",
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
} as const;
