import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "./app.tsx";
import { createFixtureClient, scriptedGame, type Script } from "./game/fixture_client.ts";
import type { GameClient } from "./game/model.ts";
import { strings } from "./lib/strings.ts";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

async function until<T>(find: () => T | null | undefined): Promise<T> {
  for (let tick = 0; tick < 2000; tick++) {
    const found = find();
    if (found) return found;
    await act(() => vi.advanceTimersByTimeAsync(1000));
  }
  throw new Error("timed out");
}

const legalTarget = () =>
  screen
    .queryAllByRole<HTMLButtonElement>("button", { name: /^Target/ })
    .find((button) => !button.disabled);

async function playToVictory(winner: string) {
  for (;;) {
    const next = await until(
      () => legalTarget() ?? screen.queryByText(strings.victory.wins(winner)),
    );
    if (next.tagName !== "BUTTON") return;
    fireEvent.click(next);
  }
}

test("clicks a hot-seat game through from the menu to the victory screen", async () => {
  render(<App />);
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  fireEvent.click(
    await until(() => screen.queryAllByRole("button", { name: strings.diceOff.throw })[0]),
  );
  await until(() => screen.queryByText(strings.diceOff.tie(["Player 1", "Player 2"])));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  await until(() => screen.queryByText(strings.game.pick("Player 1")));
  expect(
    screen.getByRole("img", { name: strings.game.dice([2, 3, 4, 5, 3, 2]) }),
  ).toBeInTheDocument();
  await playToVictory("Player 1");

  fireEvent.click(screen.getByRole("button", { name: strings.victory.again }));
  expect(screen.getByLabelText(strings.menu.player(0))).toHaveValue("Player 1");
}, 60_000);

test("clicks a game versus AI through with the AI starting", async () => {
  render(<App />);
  fireEvent.click(screen.getByLabelText(strings.menu.versusAi));
  fireEvent.change(screen.getByLabelText(strings.menu.you), { target: { value: " Ann " } });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Opa") })),
  );
  await until(() => screen.queryByText(strings.game.aiThinking("Opa")));
  await playToVictory("Opa");
  expect(screen.getByText(strings.victory.wins("Opa"))).toBeInTheDocument();
}, 60_000);

test("lets an AI dice-off winner start by itself", async () => {
  const script: Script = {
    ...scriptedGame,
    first_player_choice: { ...scriptedGame.first_player_choice, current_player: 1 },
  };
  render(<App createClient={() => createFixtureClient(script)} />);
  fireEvent.click(screen.getByLabelText(strings.menu.versusAi));
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  await until(() => screen.queryByText(strings.diceOff.aiStarts("Opa")));
  expect(screen.queryByText(strings.diceOff.whoStarts)).not.toBeInTheDocument();
  expect(await until(() => screen.queryByText(strings.game.aiThinking("Opa")))).toBeInTheDocument();
});

test("opens and closes the rules booklet", () => {
  render(<App />);
  const open = () => fireEvent.click(screen.getByRole("button", { name: strings.rules }));

  open();
  expect(screen.getByRole("dialog", { name: strings.booklet.title })).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Enter" });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  open();
  fireEvent.click(screen.getByRole("heading", { name: strings.booklet.title }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: strings.close }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  open();
  fireEvent.click(screen.getByRole("dialog").parentElement!);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

test("says something went wrong when the client fails", async () => {
  const client: GameClient = {
    start: () => Promise.reject(new Error("down")),
    chooseFirstPlayer: () => Promise.reject(new Error("down")),
    chooseTarget: () => Promise.reject(new Error("down")),
  };
  render(<App createClient={() => client} />);
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.game.error);
});
