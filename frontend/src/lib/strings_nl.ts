import type { TakeOutcome } from "../game/model.ts";
import type { Strings } from "./strings.ts";

const stones = (count: number) => (count === 1 ? "steen" : "stenen");
const dice = (count: number) => (count === 1 ? "dobbelsteen" : "dobbelstenen");

const nextStep: Record<TakeOutcome, (dice: number, target: number) => string> = {
  throw: (count) => `Gooi ${count} ${stones(count)} opnieuw`,
  reset: (_, target) => `Gooi alles opnieuw voor meer ${target}'en`,
  topped: () => "Maak het prikkie af en gooi alles opnieuw",
  ends: () => "Zet het prikkie omhoog en rond je beurt af",
  wins: () => "Maak het prikkie af en win",
};

const shortStep: Record<TakeOutcome, (dice: number) => string> = {
  throw: (count) => `Gooi ${count} ${stones(count)} opnieuw`,
  reset: () => "Alles opnieuw",
  topped: () => "Prikkie afmaken",
  ends: () => "Beurt afronden",
  wins: () => "Winnen!",
};

const steps = (count: number) => `${count} ${count === 1 ? "stap" : "stappen"}`;
const hits = (count: number, target: number) =>
  `${count} ${count === 1 ? "treffer" : "treffers"} voor de ${target}`;
const summary = (name: string, human: boolean, count: number, target: number, movement: number) =>
  `${human ? "Je pakte" : `${name} pakte`} ${hits(count, target)}, ${human ? "je prikkie" : `het prikkie van ${name}`} gaat ${steps(movement)} omhoog.`;

export const nl: Strings = {
  title: "Opa Prikkie",
  rules: "Regels",
  newGame: "Nieuw spel",
  language: "Taal",
  play: {
    label: "Zo speel je",
    withoutHints: "Zonder hints",
    withHints: "Met hints",
    automatic: "Automatisch",
    help: "?",
    helpLabel: "Wat de speelwijzen betekenen",
    helpTitle: "Speelwijzen",
    helpModes: [
      {
        heading: "Zonder hints",
        text: "Je kiest de dobbelstenen zelf. Er licht niets op tot je dobbelstenen selecteert, dus je moet de treffers zelf zien.",
      },
      {
        heading: "Met hints",
        text: "Je kiest nog steeds de dobbelstenen, maar elke kolom die je kunt spelen licht op. Een klik op een kolom pakt meteen de meeste treffers.",
      },
      {
        heading: "Automatisch",
        text: "Je kiest alleen de kolom. Het spel pakt alle treffers en gooit voor je door.",
      },
    ],
  },
  close: "Sluiten",
  stale: "Er is een nieuwe versie van Opa Prikkie.",
  reload: "Herladen",
  menu: {
    mode: "Spelvorm",
    hotSeat: "Speler tegen speler",
    versusAi: "Speler tegen AI",
    player: (seat) => `Speler ${seat + 1}`,
    you: "Jouw naam",
    opponent: "Tegenstander",
    defaultAiName: "Opa",
    colourOf: (who) => `Kleur: ${who}`,
    colours: {
      red: "Rood",
      orange: "Oranje",
      pink: "Roze",
      purple: "Paars",
      blue: "Blauw",
      cyan: "Cyaan",
      slate: "Leigrijs",
      maroon: "Bordeaux",
    },
    colourTaken: (colour) => `${colour} (gekozen door de andere speler)`,
    start: "Start",
    nameLength: "Een naam is 1 tot 20 tekens lang.",
    dev: "Dev-modus",
    seed: "Seed",
    strategy: "AI-strategie",
    randomStrategy: "Willekeurig",
  },
  diceOff: {
    title: "Dobbelduel",
    explain: "Elke speler gooit met twee dobbelstenen. Het hoogste totaal kiest wie begint.",
    tie: (names) => `Gelijkspel! ${names.join(" en ")} gooien opnieuw.`,
    wins: (name) => `${name} wint het dobbelduel!`,
    whoStarts: "Wie begint?",
    starts: (name) => `${name} begint`,
    aiStarts: (name) => `${name} wint het dobbelduel en begint.`,
  },
  game: {
    turn: (turn, name) => `Beurt ${turn}: ${name}`,
    pick: (name) => `${name}, kies een doel.`,
    selectDice: (name, hints) =>
      hints
        ? `${name}, selecteer dobbelstenen om te pakken.`
        : `${name}, selecteer dobbelstenen en klik dan op hun kolom.`,
    takeMore: (name, target) => `${name}, pak meer voor de ${target} of rond je beurt af.`,
    choose: (count, target) => `Kies ${count} x ${target}`,
    chooseNext: (outcome, count) => shortStep[outcome](count),
    next: (outcome, count, target) => nextStep[outcome](count, target),
    endTurn: "Beurt afronden",
    throwPrompt: (name) => `${name}, gooi de dobbelstenen!`,
    throws: (name) => `${name} gooit de dobbelstenen.`,
    aiThinking: (name) => `${name} denkt na...`,
    goesFor: (name, target) => `${name} gaat voor de ${target}.`,
    reset: "Alle dobbelstenen liggen apart, dus alle zes gaan opnieuw!",
    moves: (target, movement) =>
      `Prikkie ${target} gaat ${movement} ${movement === 1 ? "rij" : "rijen"} omhoog.`,
    saved: hits,
    kept: (values) => (values.length ? `Bewaard: ${values.join(", ")}` : "Niets bewaard"),
    continuation: (target) => `Prikkie ${target} staat bovenaan, gooi opnieuw!`,
    ohNo: (name, human) =>
      human
        ? "Oh nee, je hebt geen geldig doel gegooid!"
        : `Oh nee, ${name} heeft geen geldig doel gegooid.`,
    board: (name) => `Bord van ${name}`,
    column: (target, row) => `Doel ${target}, rij ${row}`,
    dice: (values) => `Dobbelstenen: ${values.join(", ")}`,
    die: (value) => `Dobbelsteen ${value}`,
    stack: (count) => `Nog ${count} ${dice(count)} om te gooien`,
    throwStack: (count) => `Gooi dobbelstenen, nog ${count}`,
    throwDice: "Gooi dobbelstenen",
    combo: (throws) => `Combo x${throws}`,
    noMore: (name, human, target, count, movement) =>
      `Geen ${target}'en meer. ${summary(name, human, count, target, movement)}`,
    ended: (name, human, target, count, movement) =>
      `${human ? "Je rondde je beurt af" : `${name} rondde de beurt af`}. ${summary(name, human, count, target, movement)}`,
    skipPopup: "Klik om te sluiten",
    seed: (seed) => `Seed: ${seed}`,
    strategy: (strategy) => `AI-strategie: ${strategy}`,
  },
  errors: {
    generic: "Er ging iets mis.",
    network: "Geen verbinding met de server. Controleer je internet en probeer het opnieuw.",
    lost: "Je spel is kwijt. Start een nieuw spel.",
    wrongPhase: "Dat kan nu niet. Het spel is al verder.",
    illegalTarget: {
      locked: (target) => `Deze beurt zit vast aan de ${target}.`,
      notATarget: "Dat is geen doel.",
      topped: "Dat prikkie staat al bovenaan.",
      noMatch: "Daar heb je geen treffer voor.",
      other: "Dat doel kan niet.",
    },
    illegalDice: {
      empty: "Kies minstens 1 treffer.",
      noMatch: "Niet elke gekozen dobbelsteen hoort bij een treffer voor dat doel.",
      notDice: "Kies de dobbelstenen opnieuw.",
      other: "Die dobbelstenen kun je niet pakken.",
    },
  },
  victory: {
    wins: (name) => `${name} wint!`,
    again: "Nog een keer",
    turns: (turns) => `Het spel duurde ${turns} ${turns === 1 ? "beurt" : "beurten"}.`,
    dice: "Gegooide dobbelstenen",
    chart: (name, counts) =>
      `Dobbelstenen van ${name}: ${counts.map((count, face) => `${face + 1} ${count} keer gegooid`).join(", ")}`,
  },
  booklet: {
    title: "Zo speel je",
    sections: [
      {
        heading: "Doel",
        text: "Breng al je twaalf prikkies van de onderkant naar de bovenkant van je bord. Het spel eindigt zodra een speler zijn laatste prikkie bovenaan heeft, en die speler wint.",
      },
      {
        heading: "Wie begint",
        text: "Elke speler gooit met twee dobbelstenen. Het hoogste totaal kiest wie begint; bij gelijkspel gooien de spelers met hetzelfde totaal opnieuw.",
      },
      {
        heading: "Jouw beurt",
        text: "Je gooit alle zes de dobbelstenen en kiest een prikkie waar een treffer voor is. Daarna blijf je gooien voor dat prikkie, of het spel doet het voor je als de beurten automatisch gaan. Speel je met de hand, dan kies je zelf welke dobbelstenen je apart legt: je mag minder treffers pakken dan je gooide, of na elke worp je beurt afronden, maar uit je eerste worp moet je minstens 1 treffer pakken.",
      },
      {
        heading: "Treffers",
        text: "De prikkies 1 tot en met 6 hebben een treffer met een enkele dobbelsteen met die waarde. De prikkies 7 tot en met 12 hebben een treffer met twee dobbelstenen die samen het getal vormen, zoals 3 en 4 voor prikkie 7.",
      },
      {
        heading: "Doorgooien",
        text: "Dobbelstenen met een treffer leg je apart en de rest gooi je opnieuw. Liggen alle dobbelstenen apart, dan gaan alle zes opnieuw en telt het aantal treffers door. Het gooien stopt als een worp geen treffer heeft, als er te weinig dobbelstenen over zijn voor een treffer, of als het prikkie bovenaan komt.",
      },
      {
        heading: "Verplaatsen",
        text: "Je prikkie gaat voor elke treffer een rij omhoog, tot het bovenaan staat. Staat een prikkie bovenaan, dan gooi je alle zes weer voor een nieuwe.",
      },
      {
        heading: "Pech",
        text: "Als een verse worp met alle zes geen treffer heeft voor een van je prikkies, gaat de beurt over. Dat geldt ook voor een worp nadat je een prikkie hebt afgemaakt.",
      },
    ],
  },
};
