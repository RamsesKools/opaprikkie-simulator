import { useCallback, useEffect, useRef, useState } from "react";
import { RulesBooklet } from "./components/rules_booklet.tsx";
import { errorMessage, isLost, isNetwork } from "./game/errors.ts";
import type { Game, GameClient, GameSetup, GameUpdate, Health, Session } from "./game/model.ts";
import { newDraft, withSeats, type Draft } from "./lib/names.ts";
import { strings } from "./lib/strings.ts";
import { version } from "./lib/version.ts";
import { DiceOff } from "./screens/dice_off.tsx";
import { GameScreen } from "./screens/game_screen.tsx";
import { Menu } from "./screens/menu.tsx";
import { Victory } from "./screens/victory.tsx";

type Screen =
  | { kind: "loading" }
  | { kind: "menu" }
  | { kind: "dice_off"; update: GameUpdate }
  | { kind: "game"; update: GameUpdate }
  | { kind: "victory"; game: Game };

function prefill(draft: Draft, { names, game }: Session): Draft {
  if (names?.length !== 2) return draft;
  const mode = game && !game.controllers.includes("ai") ? "hot_seat" : "versus_ai";
  return { ...draft, mode, roster: withSeats(draft.roster, mode, [names[0]!, names[1]!]) };
}

function resumed(game: Game | null): Screen {
  if (game?.phase === "choosing_first_player")
    return { kind: "dice_off", update: { game, logs: [] } };
  if (game?.phase === "choosing_target" || game?.phase === "choosing_dice") {
    return { kind: "game", update: { game, logs: [] } };
  }
  return { kind: "menu" };
}

type Props = { client: GameClient };

export function App({ client }: Props) {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const [draft, setDraft] = useState<Draft>(newDraft);
  // Bumped by New Game, so answers for the abandoned game are ignored.
  const round = useRef(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [rules, setRules] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [hints, setHints] = useState(true);

  // Runs again after every failure, so a redeploy behind an open tab shows the reload banner.
  const handshake = useCallback(() => {
    client.health().then(setHealth, () => {});
  }, [client]);

  useEffect(() => {
    handshake();
    client.session().then(
      (session) => {
        setDraft((current) => prefill(current, session));
        setScreen(resumed(session.game));
      },
      (failure: unknown) => {
        // Other failures leave a clean menu; Start reports them if they persist.
        if (isNetwork(failure)) setError(errorMessage(failure));
        setScreen({ kind: "menu" });
      },
    );
  }, [client, handshake]);

  // The game screen shows its own errors, so only a lost game reaches the app's alert.
  const gameFailed = useCallback(
    (failure: unknown) => {
      if (isLost(failure)) {
        setError(errorMessage(failure));
        setScreen({ kind: "menu" });
      }
      handshake();
    },
    [handshake],
  );
  const fail = useCallback(
    (failure: unknown) => {
      setError(errorMessage(failure));
      gameFailed(failure);
    },
    [gameFailed],
  );

  const start = (chosen: GameSetup) => {
    setDraft((current) => ({
      ...current,
      roster: withSeats(current.roster, chosen.mode, chosen.names),
    }));
    setError(null);
    setStarting(true);
    client
      .start(chosen)
      .then((update) => setScreen({ kind: "dice_off", update }), fail)
      .finally(() => setStarting(false));
  };

  const play = useCallback((update: GameUpdate) => setScreen({ kind: "game", update }), []);
  const chooseFirst = async (player: number) => {
    const at = round.current;
    setError(null);
    try {
      const update = await client.chooseFirstPlayer(player);
      if (at === round.current) play(update);
      return true;
    } catch (failure) {
      if (at === round.current) fail(failure);
      return false;
    }
  };
  const startOver = () => {
    round.current += 1;
    setError(null);
    setScreen({ kind: "menu" });
  };
  const finished = useCallback((game: Game) => setScreen({ kind: "victory", game }), []);
  const closeRules = useCallback(() => setRules(false), []);
  const stale = health !== null && health.version !== version;
  const dev = health?.dev_mode ? { strategies: health.strategies ?? [] } : null;

  return (
    <>
      <header className="wood">
        <div className="title">
          <h1>{strings.title}</h1>
          {screen.kind !== "menu" && screen.kind !== "loading" && (
            <button type="button" onClick={startOver}>
              {strings.newGame}
            </button>
          )}
        </div>
        <div className="controls">
          {screen.kind === "game" && (
            <>
              <label className="auto-play">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(event) => setAutoPlay(event.target.checked)}
                />
                {strings.autoPlay}
              </label>
              <label className="auto-play">
                <input
                  type="checkbox"
                  checked={hints}
                  onChange={(event) => setHints(event.target.checked)}
                />
                {strings.hints}
              </label>
            </>
          )}
          <button type="button" onClick={() => setRules(true)}>
            {strings.rules}
          </button>
        </div>
      </header>
      {stale && (
        <div className="banner" role="alert">
          {strings.stale}
          <button type="button" className="primary" onClick={() => window.location.reload()}>
            {strings.reload}
          </button>
        </div>
      )}
      <main>
        {error && <p role="alert">{error}</p>}
        {screen.kind === "menu" && (
          <Menu
            draft={draft}
            onChange={(changed) => {
              setDraft(changed);
              setError(null);
            }}
            dev={dev}
            pending={starting}
            onStart={start}
          />
        )}
        {screen.kind === "dice_off" && (
          <DiceOff update={screen.update} onChooseFirst={chooseFirst} onAiStarts={play} />
        )}
        {screen.kind === "game" && (
          <GameScreen
            client={client}
            initial={screen.update}
            autoPlay={autoPlay}
            hints={hints}
            onFinished={finished}
            onError={gameFailed}
          />
        )}
        {screen.kind === "victory" && (
          <Victory game={screen.game} onAgain={() => setScreen({ kind: "menu" })} />
        )}
      </main>
      {rules && <RulesBooklet onClose={closeRules} />}
    </>
  );
}
