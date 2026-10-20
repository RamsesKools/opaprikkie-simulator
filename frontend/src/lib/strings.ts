export const strings = {
  title: "Opa Prikkie",
  rules: "Rules",
  newGame: "New Game",
  autoPlay: "Play turns automatically",
  hints: "Show hints",
  close: "Close",
  stale: "A new version of Opa Prikkie is out.",
  reload: "Reload",
  menu: {
    mode: (label: string) => `Mode: ${label}`,
    hotSeat: "Player vs Player",
    versusAi: "Player vs AI",
    player: (seat: number) => `Player ${seat + 1}`,
    you: "Your name",
    opponent: "Opponent",
    defaultAiName: "Opa",
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
    tie: (names: string[]) => `It's a tie! ${names.join(" and ")} throw again.`,
    wins: (name: string) => `${name} wins the dice-off!`,
    whoStarts: "Who starts?",
    starts: (name: string) => `${name} starts`,
    aiStarts: (name: string) => `${name} wins the dice-off and starts.`,
  },
  game: {
    turn: (turn: number, name: string) => `Turn ${turn}: ${name}`,
    pick: (name: string) => `${name}, pick a target.`,
    selectDice: (name: string, hints: boolean) =>
      hints ? `${name}, select dice to take.` : `${name}, select dice, then click their column.`,
    takeMore: (name: string, target: number) => `${name}, take more for ${target} or stop.`,
    take: (matches: number, target: number) => `Take ${matches} x ${target}`,
    stop: "Stop",
    throwPrompt: (name: string) => `${name}, throw the dice!`,
    throws: (name: string) => `${name} throws the dice.`,
    aiThinking: (name: string) => `${name} is thinking...`,
    goesFor: (name: string, target: number) => `${name} goes for ${target}.`,
    reset: "Every die is set aside, so all six roll again!",
    moves: (target: number, movement: number) =>
      `Peg ${target} moves up ${movement} ${movement === 1 ? "row" : "rows"}.`,
    saved: (count: number, target: number) =>
      `${count} ${count === 1 ? "match" : "matches"} for ${target}`,
    kept: (values: number[]) => (values.length ? `Kept: ${values.join(", ")}` : "Nothing kept"),
    continuation: (target: number) => `Peg ${target} is at the top, roll again!`,
    ohNo: (name: string, human: boolean) =>
      human
        ? "Oh no, you didn't roll any legal targets!"
        : `Oh no, ${name} didn't roll any legal targets.`,
    board: (name: string) => `${name}'s board`,
    column: (target: number, row: number) => `Target ${target}, row ${row}`,
    dice: (values: number[]) => `Dice: ${values.join(", ")}`,
    die: (value: number) => `Die ${value}`,
    stack: (count: number) => `${count} ${count === 1 ? "die" : "dice"} left to throw`,
    throwStack: (count: number) => `Throw ${count === 1 ? "the die" : `${count} dice`}`,
    seed: (seed: number | string) => `Seed: ${seed}`,
    strategy: (strategy: string) => `AI strategy: ${strategy}`,
  },
  errors: {
    generic: "Something went wrong.",
    network: "Can't reach the server. Check your connection and try again.",
    lost: "Your game was lost. Start a new one.",
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
        text: "You roll all six dice and pick one peg that matches. Then you keep rolling for that peg, or the game does it for you when turns play automatically. Playing by hand, you pick the dice to set aside: you may take fewer matches than you rolled, or stop after any roll, but you must take at least one match from your opening roll.",
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
