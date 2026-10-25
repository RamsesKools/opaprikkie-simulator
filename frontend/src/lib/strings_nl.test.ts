import { expect, test } from "vitest";
import { nl } from "./strings_nl.ts";

test("words the menu and the dice-off", () => {
  expect(nl.menu.player(0)).toBe("Speler 1");
  expect(nl.menu.player(1)).toBe("Speler 2");
  expect(nl.diceOff.tie(["Ann", "Bob"])).toBe("Gelijkspel! Ann en Bob gooien opnieuw.");
  expect(nl.diceOff.wins("Ann")).toBe("Ann wint het dobbelduel!");
  expect(nl.diceOff.starts("Ann")).toBe("Ann begint");
  expect(nl.diceOff.aiStarts("Opa")).toBe("Opa wint het dobbelduel en begint.");
});

test("words a turn", () => {
  const { game } = nl;

  expect(game.turn(3, "Ann")).toBe("Beurt 3: Ann");
  expect(game.pick("Ann")).toBe("Ann, kies een doel.");
  expect(game.selectDice("Ann", true)).toBe("Ann, selecteer dobbelstenen om te pakken.");
  expect(game.selectDice("Ann", false)).toBe(
    "Ann, selecteer dobbelstenen en klik dan op hun kolom.",
  );
  expect(game.takeMore("Ann", 7)).toBe("Ann, pak meer voor de 7 of rond je beurt af.");
  expect(game.choose(2, 6)).toBe("Kies 2 x 6");
  expect(game.throwPrompt("Ann")).toBe("Ann, gooi de dobbelstenen!");
  expect(game.throws("Opa")).toBe("Opa gooit de dobbelstenen.");
  expect(game.aiThinking("Opa")).toBe("Opa denkt na...");
  expect(game.goesFor("Opa", 7)).toBe("Opa gaat voor de 7.");
  expect(game.continuation(7)).toBe("Prikkie 7 staat bovenaan, gooi opnieuw!");
  expect(game.combo(3)).toBe("Combo x3");
});

test("words what a take leads to", () => {
  const { game } = nl;

  expect(game.next("throw", 1, 3)).toBe("Gooi 1 steen opnieuw");
  expect(game.next("throw", 4, 3)).toBe("Gooi 4 stenen opnieuw");
  expect(game.next("reset", 6, 3)).toBe("Gooi alles opnieuw voor meer 3'en");
  expect(game.next("topped", 6, 3)).toBe("Maak het prikkie af en gooi alles opnieuw");
  expect(game.next("ends", 0, 3)).toBe("Zet het prikkie omhoog en rond je beurt af");
  expect(game.next("wins", 0, 3)).toBe("Maak het prikkie af en win");
  expect(game.chooseNext("throw", 1)).toBe("Gooi 1 steen opnieuw");
  expect(game.chooseNext("throw", 5)).toBe("Gooi 5 stenen opnieuw");
  expect(game.chooseNext("reset", 6)).toBe("Alles opnieuw");
  expect(game.chooseNext("topped", 6)).toBe("Prikkie afmaken");
  expect(game.chooseNext("ends", 0)).toBe("Beurt afronden");
  expect(game.chooseNext("wins", 0)).toBe("Winnen!");
});

test("words the table", () => {
  const { game } = nl;

  expect(game.moves(7, 1)).toBe("Prikkie 7 gaat 1 rij omhoog.");
  expect(game.moves(7, 3)).toBe("Prikkie 7 gaat 3 rijen omhoog.");
  expect(game.saved(1, 7)).toBe("1 combinatie voor de 7");
  expect(game.saved(3, 7)).toBe("3 combinaties voor de 7");
  expect(game.kept([2, 5])).toBe("Bewaard: 2, 5");
  expect(game.kept([])).toBe("Niets bewaard");
  expect(game.board("Ann")).toBe("Bord van Ann");
  expect(game.column(7, 2)).toBe("Doel 7, rij 2");
  expect(game.dice([1, 2])).toBe("Dobbelstenen: 1, 2");
  expect(game.die(4)).toBe("Dobbelsteen 4");
  expect(game.stack(1)).toBe("Nog 1 dobbelsteen om te gooien");
  expect(game.stack(5)).toBe("Nog 5 dobbelstenen om te gooien");
  expect(game.throwStack(5)).toBe("Dobbelen, nog 5");
  expect(game.seed("abc")).toBe("Seed: abc");
  expect(game.strategy("greedy")).toBe("AI-strategie: greedy");
});

test("words the no legal target message for a human and for another player", () => {
  expect(nl.game.ohNo("Ann", true)).toBe("Oh nee, je hebt geen geldig doel gegooid!");
  expect(nl.game.ohNo("Opa", false)).toBe("Oh nee, Opa heeft geen geldig doel gegooid.");
});

test("words the end of a sequence for a human and for another player", () => {
  const { game } = nl;

  expect(game.noMore("Ann", true, 10, 3, 3)).toBe(
    "Geen 10'en meer. Je pakte 3 combinaties voor de 10, je prikkie gaat 3 stappen omhoog.",
  );
  expect(game.noMore("Opa", false, 10, 1, 1)).toBe(
    "Geen 10'en meer. Opa pakte 1 combinatie voor de 10, het prikkie van Opa gaat 1 stap omhoog.",
  );
  expect(game.ended("Ann", true, 10, 3, 3)).toBe(
    "Je rondde je beurt af. Je pakte 3 combinaties voor de 10, je prikkie gaat 3 stappen omhoog.",
  );
  expect(game.ended("Opa", false, 10, 3, 3)).toBe(
    "Opa rondde de beurt af. Opa pakte 3 combinaties voor de 10, het prikkie van Opa gaat 3 stappen omhoog.",
  );
});

test("words the victory screen", () => {
  expect(nl.victory.wins("Ann")).toBe("Ann wint!");
  expect(nl.victory.turns(1)).toBe("Het spel duurde 1 beurt.");
  expect(nl.victory.turns(54)).toBe("Het spel duurde 54 beurten.");
  expect(nl.victory.chart("Ann", [1, 2, 3, 4, 5, 6])).toBe(
    "Dobbelstenen van Ann: 1 keer een 1, 2 keer een 2, 3 keer een 3, 4 keer een 4, 5 keer een 5, 6 keer een 6",
  );
});
