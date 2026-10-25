import { act, cleanup, fireEvent, screen, within } from "@testing-library/react";
import { render } from "./test_utils.tsx";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { App } from "./app.tsx";
import { createApiClient } from "./game/api_client.ts";
import { createFixtureClient, scriptedGame, type Script } from "./game/fixture_client.ts";
import {
  GameError,
  type Game,
  type GameClient,
  type GameUpdate,
  type Session,
} from "./game/model.ts";
import { timing } from "./game/timing.ts";
import { STORAGE_KEY } from "./lib/language.ts";
import { en as strings } from "./lib/strings_en.ts";
import { nl } from "./lib/strings_nl.ts";

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

const hotSeat = () => fireEvent.click(screen.getByRole("radio", { name: strings.menu.hotSeat }));

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

test("switches how to play from the header during the game", async () => {
  await renderApp();
  const slider = () => screen.queryByRole("radiogroup", { name: strings.play.label });
  const mode = (label: string) => screen.getByRole("radio", { name: label });
  const lit = () => document.querySelectorAll(".column.legal");
  expect(slider()).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  await until(() => screen.queryByText(strings.game.pick("Player 1")));
  expect(mode(strings.play.automatic)).toBeChecked();
  expect(lit()).not.toHaveLength(0);
  fireEvent.click(mode(strings.play.withoutHints));
  expect(screen.getByText(strings.game.selectDice("Player 1", false))).toBeInTheDocument();
  expect(lit()).toHaveLength(0);
  fireEvent.click(mode(strings.play.withHints));
  expect(screen.getByText(strings.game.selectDice("Player 1", true))).toBeInTheDocument();
  expect(lit()).not.toHaveLength(0);
  fireEvent.keyDown(mode(strings.play.withHints), { key: "ArrowRight" });
  expect(mode(strings.play.automatic)).toBeChecked();
  fireEvent.click(legalTarget()!);
  fireEvent.click(mode(strings.play.withoutHints));

  const throwStack = () => screen.queryByRole("button", { name: /^Throw/ });
  await until(throwStack);
  fireEvent.click(mode(strings.play.automatic));
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
  expect(screen.getByRole("region", { name: strings.booklet.title })).toHaveFocus();
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

test("explains the play modes in a scroll from the ? button, next to the slider", async () => {
  await resumeWith(saved(scriptedGame.branches[0]!.steps[0]!.game));
  const open = await until(() => screen.queryByRole("button", { name: strings.play.helpLabel }));
  expect(open).toHaveTextContent("?");

  open.focus();
  fireEvent.click(open);
  const dialog = screen.getByRole("dialog", { name: strings.play.helpTitle });
  for (const { heading, text } of strings.play.helpModes) {
    expect(within(dialog).getByRole("heading", { name: heading })).toBeInTheDocument();
    expect(within(dialog).getByText(text)).toBeInTheDocument();
  }
  expect(within(dialog).getByRole("button", { name: strings.close })).toHaveFocus();

  fireEvent.keyDown(window, { key: "Escape" });
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  expect(open).toHaveFocus();
});

test("only shows the ? button while a game is on", async () => {
  await renderApp();

  expect(screen.queryByRole("button", { name: strings.play.helpLabel })).not.toBeInTheDocument();
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

describe("splash", () => {
  const title = () => screen.queryByRole("heading", { name: strings.title });
  const splash = () => document.getElementById("splash");
  const hidden = () => splash()?.classList.contains("done") ?? true;

  beforeEach(() => {
    document.body.insertAdjacentHTML("beforeend", '<div id="splash"></div>');
    vi.stubGlobal("matchMedia", () => ({ matches: false }));
  });

  afterEach(() => {
    splash()?.remove();
    vi.unstubAllGlobals();
  });

  test("keeps the splash and shows nothing else until the textures are loaded", async () => {
    let loaded!: () => void;
    const assets = new Promise<void>((resolve) => (loaded = resolve));
    render(<App client={createFixtureClient()} assets={assets} />);
    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(title()).not.toBeInTheDocument();
    expect(hidden()).toBe(false);

    loaded();
    await until(() => screen.queryByRole("button", { name: strings.menu.start }));
    expect(hidden()).toBe(true);
  });

  test("keeps the splash and shows nothing else until the session is loaded", async () => {
    let answer!: (session: Session) => void;
    const session = () => new Promise<Session>((resolve) => (answer = resolve));
    render(<App client={{ ...createFixtureClient(), session }} />);
    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(title()).not.toBeInTheDocument();
    expect(hidden()).toBe(false);

    answer({ names: null, game: null });
    await until(() => screen.queryByRole("button", { name: strings.menu.start }));
    expect(hidden()).toBe(true);
  });

  test("goes away when the textures fail to load", async () => {
    render(<App client={createFixtureClient()} assets={Promise.reject(new Error("broken"))} />);
    await until(() => screen.queryByRole("button", { name: strings.menu.start }));

    expect(hidden()).toBe(true);
  });

  test("goes away with the network message when the session stalls", async () => {
    const client = createApiClient({
      baseUrl: "http://test",
      fetch: (request) =>
        new Promise<Response>((_, reject) =>
          request.signal.addEventListener("abort", () => reject(request.signal.reason)),
        ),
    });
    render(<App client={client} />);
    await act(() => vi.advanceTimersByTimeAsync(timing.sessionCap - 1));
    expect(hidden()).toBe(false);

    await act(() => vi.advanceTimersByTimeAsync(1));
    await until(() => screen.queryByRole("button", { name: strings.menu.start }));

    expect(hidden()).toBe(true);
    expect(screen.getByRole("alert")).toHaveTextContent(strings.errors.network);
  });

  test("goes away for a resumed game, without showing the menu first", async () => {
    const game = scriptedGame.branches[0]!.steps[0]!.game;
    await resumeWith(saved(game));
    await until(() => screen.queryByText(strings.game.pick("Ann")));

    expect(screen.queryByRole("button", { name: strings.menu.start })).not.toBeInTheDocument();
    expect(hidden()).toBe(true);
  });

  test("goes away when the session fails to load", async () => {
    await renderApp({ ...createFixtureClient(), session: down });

    expect(hidden()).toBe(true);
  });
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

test("resumes a sequence in progress on reload, playing it on automatically", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  const opened = scriptedGame.branches[0]!.steps[0]!.game;
  const observation = opened.observation!;
  const sequence = {
    target: 2,
    rolls: [{ dice: observation.opening_roll, set_aside: [0], reset: false, matches: 1 }],
    matches: 1,
    dice: [2, 3, 4, 5, 1],
    reset: false,
  };
  const game = {
    ...opened,
    phase: "choosing_dice" as const,
    observation: {
      ...observation,
      legal_targets: [{ target: 2, matches: 1, guaranteed_moves: 1, set_aside: [0] }],
      sequence,
    },
  };
  await resumeWith(saved(game), { take });

  await until(() => (take.mock.calls.length ? true : null));
  expect(take).toHaveBeenCalledExactlyOnceWith(2, [0]);
});

test("resumes a sequence in progress by hand when playing without hints", async () => {
  const take = vi.fn<GameClient["take"]>(() => new Promise(() => {}));
  const opened = scriptedGame.branches[0]!.steps[0]!.game;
  const game = {
    ...opened,
    phase: "choosing_dice" as const,
    observation: {
      ...opened.observation!,
      sequence: {
        target: 2,
        rolls: [
          { dice: opened.observation!.opening_roll, set_aside: [0], reset: false, matches: 1 },
        ],
        matches: 1,
        dice: [2, 3, 4, 5, 1],
        reset: false,
      },
      takes: [
        { target: 2, dice: [0], matches: 1, row: 2, outcome: "throw" as const, next_dice: 4 },
      ],
    },
  };
  await resumeWith(saved(game), { take });
  const manual = await until(() =>
    screen.queryByRole("radio", { name: strings.play.withoutHints }),
  );

  fireEvent.click(manual);
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.game.throwStack(5) })),
  );

  expect(screen.getByText(strings.game.takeMore("Ann", 2))).toBeInTheDocument();
  expect(screen.getByRole("button", { name: strings.game.endTurn })).toBeInTheDocument();
  expect(take).not.toHaveBeenCalled();
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
  fireEvent.click(screen.getByRole("radio", { name: strings.menu.versusAi }));
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

test("sends the play mode at the start and whenever the slider changes", async () => {
  const fixture = createFixtureClient();
  const start = vi.fn<GameClient["start"]>((setup) => fixture.start(setup));
  const setPlayMode = vi.fn<GameClient["setPlayMode"]>((mode) => fixture.setPlayMode(mode));
  await renderApp({ ...fixture, start, setPlayMode });

  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );
  await until(() => screen.queryByText(strings.game.pick("Player 1")));
  expect(start).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ playMode: "automatic" }));
  expect(setPlayMode).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("radio", { name: strings.play.withoutHints }));
  fireEvent.click(screen.getByRole("radio", { name: strings.play.withHints }));

  expect(setPlayMode.mock.calls).toEqual([["without_hints"], ["with_hints"]]);
}, 60_000);

test("tells the backend where the slider starts after a reload", async () => {
  const game = scriptedGame.branches[0]!.steps[0]!.game;
  const setPlayMode = vi.fn<GameClient["setPlayMode"]>(async () => ({
    game: saved(game).game,
    logs: [],
  }));
  await resumeWith(saved(game), { setPlayMode });

  await until(() => screen.queryByText(strings.game.pick("Ann")));

  expect(setPlayMode).toHaveBeenCalledExactlyOnceWith("automatic");
});

test("sends no play mode on reload when there is no game", async () => {
  const setPlayMode = vi.fn<GameClient["setPlayMode"]>();
  await renderApp({ ...createFixtureClient(), setPlayMode });

  expect(setPlayMode).not.toHaveBeenCalled();
});

const pick = (group: string, colour: keyof typeof strings.menu.colours) =>
  fireEvent.click(
    within(screen.getByRole("radiogroup", { name: strings.menu.colourOf(group) })).getByRole(
      "radio",
      { name: strings.menu.colours[colour] },
    ),
  );
const seatOf = (name: string) =>
  screen.getByRole("region", { name: strings.game.board(name) }).style.getPropertyValue("--seat");

test("plays in the chosen colours and keeps them across a reload", async () => {
  await renderApp();
  pick(strings.menu.you, "pink");
  pick(strings.menu.opponent, "purple");
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  await until(() => screen.queryByText(strings.game.pick("Player 1")));
  expect(seatOf("Player 1")).toBe("#d6479c");
  expect(seatOf("Opa")).toBe("#7b3fc4");

  cleanup();
  await renderApp();
  expect(
    within(
      screen.getByRole("radiogroup", { name: strings.menu.colourOf(strings.menu.you) }),
    ).getByRole("radio", { name: strings.menu.colours.pink }),
  ).toBeChecked();
}, 60_000);

test("resumes a game in the saved colours", async () => {
  localStorage.setItem(
    "opaprikkie.colours",
    JSON.stringify({ players: ["maroon", "slate"], ai: "slate" }),
  );
  const game = scriptedGame.branches[0]!.steps[0]!.game;
  await resumeWith(saved(game));

  await until(() => screen.queryByText(strings.game.pick("Ann")));
  expect(seatOf("Ann")).toBe("#8c1d40");
  expect(seatOf("Bob")).toBe("#4a4f5c");
});

const language = (label: string) => screen.getByRole("radio", { name: label });

test("starts in Dutch on a first visit, with Dutch default names", async () => {
  localStorage.clear();
  render(<App client={createFixtureClient()} />);

  await until(() => screen.queryByRole("button", { name: nl.menu.start }));

  expect(document.documentElement.lang).toBe("nl");
  expect(language("NL")).toBeChecked();
  expect(screen.getByLabelText(nl.menu.you)).toHaveValue("Speler 1");
  expect(screen.getByLabelText(nl.menu.opponent)).toHaveValue("Opa");
  expect(screen.getByRole("heading", { name: nl.title })).toBeInTheDocument();
});

test("switches the menu to English, keeping the choice and the names typed", async () => {
  localStorage.clear();
  render(<App client={createFixtureClient()} />);
  await until(() => screen.queryByRole("button", { name: nl.menu.start }));
  fireEvent.change(screen.getByLabelText(nl.menu.you), { target: { value: "Ann" } });

  fireEvent.click(language("EN"));

  expect(screen.getByRole("button", { name: strings.menu.start })).toBeInTheDocument();
  expect(screen.getByLabelText(strings.menu.you)).toHaveValue("Ann");
  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Opa");
  expect(document.documentElement.lang).toBe("en");
  expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
  hotSeat();
  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Player 2");
  fireEvent.click(language("NL"));
  expect(screen.getByLabelText(nl.menu.player(1))).toHaveValue("Speler 2");
});

test("remembers the language on the next visit", async () => {
  const { unmount } = render(<App client={createFixtureClient()} />);
  await until(() => screen.queryByRole("button", { name: strings.menu.start }));
  fireEvent.click(language("NL"));
  unmount();

  render(<App client={createFixtureClient()} />);

  expect(
    await until(() => screen.queryByRole("button", { name: nl.menu.start })),
  ).toBeInTheDocument();
});

test("switches the whole UI at once mid-game, without touching the game", async () => {
  const fixture = createFixtureClient();
  const calls = {
    start: vi.fn<GameClient["start"]>((setup) => fixture.start(setup)),
    chooseFirstPlayer: vi.fn<GameClient["chooseFirstPlayer"]>((p) => fixture.chooseFirstPlayer(p)),
    chooseTarget: vi.fn<GameClient["chooseTarget"]>((t) => fixture.chooseTarget(t)),
    take: vi.fn<GameClient["take"]>((t, dice) => fixture.take(t, dice)),
    stop: vi.fn<GameClient["stop"]>(() => fixture.stop()),
    setPlayMode: vi.fn<GameClient["setPlayMode"]>((m) => fixture.setPlayMode(m)),
    session: vi.fn<GameClient["session"]>(() => fixture.session()),
  };
  await renderApp({ ...fixture, ...calls });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );
  await until(() => screen.queryByText(strings.game.pick("Player 1")));
  const before = Object.values(calls).map((call) => call.mock.calls.length);
  const dice = screen.getByRole("img", { name: strings.game.dice([2, 3, 4, 5, 3, 2]) });

  fireEvent.click(language("NL"));

  expect(screen.getByText(nl.game.pick("Player 1"))).toBeInTheDocument();
  expect(screen.getByText(nl.game.turn(1, "Player 1"))).toBeInTheDocument();
  expect(screen.getByRole("button", { name: nl.newGame })).toBeInTheDocument();
  expect(screen.getByRole("radio", { name: nl.play.withHints })).toBeInTheDocument();
  expect(screen.getByRole("img", { name: nl.game.dice([2, 3, 4, 5, 3, 2]) })).toBe(dice);
  expect(screen.getByRole("region", { name: nl.game.board("Player 1") })).toBeInTheDocument();
  expect(Object.values(calls).map((call) => call.mock.calls.length)).toEqual(before);
  fireEvent.click(screen.getByRole("button", { name: nl.rules }));
  expect(screen.getByRole("dialog", { name: nl.booklet.title })).toBeInTheDocument();
}, 60_000);

test("translates the message of a sequence being replayed", async () => {
  await renderApp();
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );
  fireEvent.click(await until(legalTarget));
  await until(() => screen.queryByText(/^Player 1 goes for \d+\.$/));

  fireEvent.click(language("NL"));

  expect(screen.getByText(/^Player 1 gaat voor de \d+\.$/)).toBeInTheDocument();
}, 60_000);

test("words a rejection in the current language and rewords it on a switch", async () => {
  const locked = () =>
    Promise.reject(
      new GameError("illegal_target", "the sequence is locked to 7", {
        reason: "locked",
        legalTargets: [7],
      }),
    );
  await renderApp({ ...createFixtureClient(), chooseTarget: locked });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: strings.diceOff.starts("Player 1") })),
  );

  fireEvent.click(await until(legalTarget));

  expect(
    await until(() => screen.queryByText(strings.errors.illegalTarget.locked(7))),
  ).toBeVisible();
  fireEvent.click(language("NL"));
  expect(screen.getByText(nl.errors.illegalTarget.locked(7))).toBeVisible();
}, 60_000);

test("shows the version banner and a lost game in the current language", async () => {
  localStorage.setItem(STORAGE_KEY, "nl");
  const gone = () => Promise.reject(new GameError("no_game", "start a game first"));
  await renderApp(
    {
      ...createFixtureClient(),
      health: async () => health("0.0.0-other"),
      chooseFirstPlayer: gone,
    },
    false,
  );
  await until(() => screen.queryByRole("button", { name: nl.menu.start }));
  fireEvent.click(screen.getByRole("button", { name: nl.menu.start }));
  fireEvent.click(
    await until(() => screen.queryByRole("button", { name: nl.diceOff.starts("Speler 1") })),
  );

  const alerts = await until(
    () => screen.queryAllByRole("alert")[1] && screen.queryAllByRole("alert"),
  );
  expect(alerts[0]).toHaveTextContent(nl.stale);
  expect(alerts[1]).toHaveTextContent(nl.errors.lost);
  expect(screen.getByRole("button", { name: nl.reload })).toBeInTheDocument();
});
