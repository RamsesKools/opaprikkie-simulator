import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { App } from "./app.tsx";
import { createFixtureClient, scriptedGame, type Script } from "./game/fixture_client.ts";
import {
  GameError,
  type Game,
  type GameClient,
  type GameUpdate,
  type Session,
} from "./game/model.ts";
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

async function renderApp(client: GameClient = createFixtureClient(), menu = true) {
  render(<App client={client} />);
  if (menu) await until(() => screen.queryByRole("button", { name: strings.menu.start }));
}

const hotSeat = () =>
  fireEvent.click(screen.getByRole("button", { name: strings.menu.mode(strings.menu.versusAi) }));

test("clicks a hot-seat game through from the menu to the victory screen", async () => {
  await renderApp();
  hotSeat();
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  fireEvent.click(
    await until(() => screen.queryAllByRole("button", { name: strings.game.throwStack(2) })[0]),
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
  await renderApp();
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
  const choice = scriptedGame.first_player_choice;
  const script: Script = {
    ...scriptedGame,
    first_player_choice: { ...choice, observation: { ...choice.observation!, seat: 1 } },
  };
  await renderApp(createFixtureClient(script));
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  await until(() =>
    screen.queryByText((_, element) => element?.textContent === strings.diceOff.aiStarts("Opa")),
  );
  expect(screen.queryByText(strings.diceOff.whoStarts)).not.toBeInTheDocument();
  expect(await until(() => screen.queryByText(strings.game.aiThinking("Opa")))).toBeInTheDocument();
});

test("toggles automatic turns from the header during the game", async () => {
  await renderApp();
  const toggle = () => screen.queryByRole("checkbox", { name: strings.autoPlay });
  expect(toggle()).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  await until(() => screen.queryByText(strings.game.pick("Player 1")));
  expect(toggle()).toBeChecked();
  fireEvent.click(toggle()!);
  expect(screen.getByText(strings.game.pick("Player 1"))).toBeInTheDocument();
  fireEvent.click(legalTarget()!);

  const throwStack = () => screen.queryByRole("button", { name: /^Throw/ });
  await until(throwStack);
  fireEvent.click(toggle()!);
  expect(throwStack()).not.toBeInTheDocument();
}, 60_000);

test("opens and closes the rules booklet", async () => {
  await renderApp();
  const open = () => fireEvent.click(screen.getByRole("button", { name: strings.rules }));

  screen.getByRole("button", { name: strings.rules }).focus();
  open();
  expect(screen.getByRole("dialog", { name: strings.booklet.title })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: strings.close })).toHaveFocus();
  fireEvent.keyDown(window, { key: "Tab" });
  expect(screen.getByRole("button", { name: strings.close })).toHaveFocus();
  fireEvent.keyDown(window, { key: "Enter" });
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: strings.rules })).toHaveFocus();

  open();
  fireEvent.click(screen.getByRole("heading", { name: strings.booklet.title }));
  expect(screen.getByRole("dialog")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: strings.close }));
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

  open();
  fireEvent.click(screen.getByRole("dialog").parentElement!);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});

const down = () => Promise.reject(new GameError("internal_error", "down"));

test("lets the menu start again after a failed start", async () => {
  await renderApp({ ...createFixtureClient(), start: down });
  const start = screen.getByRole("button", { name: strings.menu.start });
  fireEvent.click(start);
  expect(start).toBeDisabled();

  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.errors.generic);
  expect(start).toBeEnabled();
});

test("lets the dice-off winner choose again after a failed choice", async () => {
  const fixture = createFixtureClient();
  const client: GameClient = {
    ...fixture,
    chooseFirstPlayer: vi
      .fn<GameClient["chooseFirstPlayer"]>((player) => fixture.chooseFirstPlayer(player))
      .mockImplementationOnce(down),
  };
  await renderApp(client);
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  const starts = () => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") });

  fireEvent.click(await until(starts));
  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.errors.generic);
  fireEvent.click(starts()!);

  await until(() => screen.queryByText(strings.game.pick("Player 1")));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
}, 60_000);

test("prefills the names and mode from the session's finished game", async () => {
  const game = { ...scriptedGame.branches[0]!.final, names: ["Ann", "Bob"] };
  const session = vi.fn<GameClient["session"]>(async () => ({
    names: ["Ann", "Bob"],
    game: { ...game, controllers: ["human", "human"] },
  }));
  await renderApp({ ...createFixtureClient(), session });

  expect(screen.getByLabelText(strings.menu.player(0))).toHaveValue("Ann");
  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Bob");
});

test("shows the menu with defaults when the session can't load", async () => {
  await renderApp({ ...createFixtureClient(), session: down });

  expect(screen.getByLabelText(strings.menu.you)).toHaveValue("Player 1");
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

test("says on load when the server can't be reached", async () => {
  const offline = () => Promise.reject(new GameError("network", "offline"));
  await renderApp({ ...createFixtureClient(), session: offline });

  expect(screen.getByRole("alert")).toHaveTextContent(strings.errors.network);
  expect(screen.getByLabelText(strings.menu.you)).toHaveValue("Player 1");
});

test("shows a first visit's menu without an alert", async () => {
  await renderApp();

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});

const health = (version: string, dev_mode = false) => ({
  version,
  dev_mode,
  strategies: dev_mode ? ["greedy", "smart"] : null,
});

test("asks for a reload when the backend runs another version", async () => {
  await renderApp({ ...createFixtureClient(), health: async () => health("0.0.0-other") });

  expect(screen.getByRole("alert")).toHaveTextContent(strings.stale);
  expect(screen.getByRole("button", { name: strings.reload })).toBeInTheDocument();
});

test("checks the version again after a failure", async () => {
  const fixture = createFixtureClient();
  const versions = vi
    .fn<GameClient["health"]>()
    .mockImplementationOnce(() => fixture.health())
    .mockResolvedValue(health("0.0.0-other"));
  await renderApp({ ...fixture, health: versions, start: down });
  expect(screen.queryByText(strings.stale)).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(await until(() => screen.queryByText(strings.stale))).toBeInTheDocument();
  expect(versions).toHaveBeenCalledTimes(2);
});

test("keeps playing when the version check fails", async () => {
  await renderApp({ ...createFixtureClient(), health: down });

  expect(screen.queryByText(strings.stale)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(strings.menu.seed)).not.toBeInTheDocument();
});

test("passes the dev mode seed and strategy to the game", async () => {
  const fixture = createFixtureClient();
  const start = vi.fn<GameClient["start"]>((setup) => fixture.start(setup));
  const { version } = await fixture.health();
  await renderApp({ ...fixture, health: async () => health(version, true), start });

  fireEvent.change(screen.getByLabelText(strings.menu.seed), { target: { value: "s1" } });
  fireEvent.change(screen.getByLabelText(strings.menu.strategy), { target: { value: "smart" } });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(start).toHaveBeenCalledWith(expect.objectContaining({ seed: "s1", strategy: "smart" }));
  expect(screen.queryByText(strings.stale)).not.toBeInTheDocument();
});

const lost = () => Promise.reject(new GameError("no_session", "create a session first"));

test("goes back to the menu when the game is lost mid-game", async () => {
  await renderApp({ ...createFixtureClient(), chooseTarget: lost });
  fireEvent.change(screen.getByLabelText(strings.menu.you), { target: { value: "Ann" } });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Ann") })),
  );

  fireEvent.click(await until(legalTarget));

  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.errors.lost);
  expect(screen.getByLabelText(strings.menu.you)).toHaveValue("Ann");
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
}, 60_000);

test("goes back to the menu when the game is lost in the dice-off", async () => {
  const gone = () => Promise.reject(new GameError("no_game", "start a game first"));
  await renderApp({ ...createFixtureClient(), chooseFirstPlayer: gone });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.errors.lost);
  expect(screen.getByRole("button", { name: strings.menu.start })).toBeEnabled();
});

test("says when the server can't be reached at the start", async () => {
  const offline = () => Promise.reject(new GameError("network", "offline"));
  await renderApp({ ...createFixtureClient(), start: offline });

  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.errors.network);
});

test("leaves other game errors to the game screen", async () => {
  await renderApp({ ...createFixtureClient(), chooseTarget: down });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  fireEvent.click(await until(legalTarget));

  expect(await until(() => screen.queryByText(strings.errors.generic))).toBeInTheDocument();
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  expect(legalTarget()).toBeDefined();
}, 60_000);

const saved = (game: Omit<Game, "names" | "controllers">, names = ["Ann", "Bob"]) => ({
  names,
  game: { ...game, names, controllers: ["human", "human"] } as Game,
});

const resumeWith = (session: Session, client: Partial<GameClient> = {}) =>
  renderApp({ ...createFixtureClient(), session: async () => session, ...client }, false);

test("resumes a game in play on reload", async () => {
  const chooseTarget = vi.fn<GameClient["chooseTarget"]>(() => new Promise(() => {}));
  const game = scriptedGame.branches[0]!.steps[0]!.game;
  await resumeWith(saved(game), { chooseTarget });

  await until(() => screen.queryByText(strings.game.pick("Ann")));
  expect(screen.queryByRole("button", { name: strings.menu.start })).not.toBeInTheDocument();
  expect(
    screen.getByRole("img", { name: strings.game.dice(game.observation!.opening_roll) }),
  ).toBeInTheDocument();
  fireEvent.click(legalTarget()!);
  expect(chooseTarget).toHaveBeenCalledExactlyOnceWith(game.observation!.legal_targets[0]!.target);
});

test("resumes the dice-off winner's choice on reload", async () => {
  const chooseFirstPlayer = vi.fn<GameClient["chooseFirstPlayer"]>(() => new Promise(() => {}));
  await resumeWith(saved(scriptedGame.first_player_choice), { chooseFirstPlayer });

  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Bob") })),
  );

  expect(chooseFirstPlayer).toHaveBeenCalledExactlyOnceWith(1);
});

test("goes back to the menu when a resumed game is lost", async () => {
  await resumeWith(saved(scriptedGame.branches[0]!.steps[0]!.game), { chooseTarget: lost });

  fireEvent.click(await until(legalTarget));

  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.errors.lost);
  expect(screen.getByLabelText(strings.menu.player(0))).toHaveValue("Ann");
}, 60_000);

test.each([
  ["finished", scriptedGame.branches[0]!.final],
  ["unnamed", { ...scriptedGame.first_player_choice, phase: "naming", observation: null }],
] as const)("shows the menu for a %s game", async (_, game) => {
  await resumeWith(saved(game as Omit<Game, "names" | "controllers">));

  await until(() => screen.queryByRole("button", { name: strings.menu.start }));
  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Bob");
});

const newGame = () => screen.queryByRole("button", { name: strings.newGame });

test("starts over with New Game, keeping every name", async () => {
  await renderApp();
  expect(newGame()).not.toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(strings.menu.opponent), { target: { value: "Oma" } });
  hotSeat();
  fireEvent.change(screen.getByLabelText(strings.menu.player(0)), { target: { value: "Ann" } });
  fireEvent.change(screen.getByLabelText(strings.menu.player(1)), { target: { value: " Bob " } });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Ann") })),
  );
  await until(() => screen.queryByText(strings.game.pick("Ann")));

  fireEvent.click(newGame()!);

  expect(screen.getByLabelText(strings.menu.player(0))).toHaveValue("Ann");
  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Bob");
  fireEvent.click(screen.getByRole("button", { name: strings.menu.mode(strings.menu.hotSeat) }));
  expect(screen.getByLabelText(strings.menu.you)).toHaveValue("Ann");
  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Oma");
  expect(newGame()).not.toBeInTheDocument();
}, 60_000);

test("ignores a dice-off choice that lands after New Game", async () => {
  const fixture = createFixtureClient();
  let land = () => {};
  const chooseFirstPlayer = (player: number) =>
    new Promise<GameUpdate>((resolve) => {
      land = () => resolve(fixture.chooseFirstPlayer(player));
    });
  await renderApp({ ...fixture, chooseFirstPlayer });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  fireEvent.click(newGame()!);
  land();
  await act(() => vi.advanceTimersByTimeAsync(5000));

  expect(screen.getByRole("button", { name: strings.menu.start })).toBeInTheDocument();
}, 60_000);

test("ignores a pick that fails after New Game", async () => {
  let fail = () => {};
  const chooseTarget = () =>
    new Promise<GameUpdate>((_, reject) => {
      fail = () => reject(new GameError("no_session", "gone"));
    });
  await renderApp({ ...createFixtureClient(), chooseTarget });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );
  fireEvent.click(await until(legalTarget));

  fireEvent.click(newGame()!);
  fail();
  await act(() => vi.advanceTimersByTimeAsync(0));

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
}, 60_000);

test("offers New Game on the victory screen too", async () => {
  await renderApp();
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Opa") })),
  );
  await playToVictory("Opa");

  fireEvent.click(newGame()!);

  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Opa");
}, 60_000);

test("clears the lost-game alert once the menu changes", async () => {
  const gone = () => Promise.reject(new GameError("no_game", "start a game first"));
  await renderApp({ ...createFixtureClient(), chooseFirstPlayer: gone });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );
  expect(await until(() => screen.queryByRole("alert"))).toHaveTextContent(strings.errors.lost);

  fireEvent.change(screen.getByLabelText(strings.menu.you), { target: { value: "Ann" } });

  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
});
