import { useCallback, useEffect, useRef, useState } from "react";
import { PlayHelp } from "./components/play_help.tsx";
import { RulesBooklet } from "./components/rules_booklet.tsx";
import { Slider } from "./components/slider.tsx";
import { errorMessage, isLost, isNetwork } from "./game/errors.ts";
import type {
  Game,
  GameClient,
  GameSetup,
  GameUpdate,
  Health,
  PlayMode,
  Session,
} from "./game/model.ts";
import { newDraft, withSeats, type Draft } from "./lib/names.ts";
import { hideSplash } from "./lib/splash.ts";
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

const INITIAL_PLAY_MODE: PlayMode = "automatic";

const playModes = [
  { value: "without_hints", label: strings.play.withoutHints },
  { value: "with_hints", label: strings.play.withHints },
  { value: "automatic", label: strings.play.automatic },
] as const satisfies { value: PlayMode; label: string }[];

type Props = { client: GameClient; assets?: Promise<unknown> };

export function App({ client, assets = Promise.resolve() }: Props) {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const [draft, setDraft] = useState<Draft>(newDraft);
  // Bumped by New Game, so answers for the abandoned game are ignored.
  const round = useRef(0);
  const [health, setHealth] = useState<Health | null>(null);
  const [rules, setRules] = useState(false);
  const [help, setHelp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);
  const [playMode, setPlayMode] = useState<PlayMode>(INITIAL_PLAY_MODE);
  const [loaded, setLoaded] = useState(false);

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
        // The slider doesn't survive a reload, so the backend learns where it starts again.
        if (session.game) client.setPlayMode(INITIAL_PLAY_MODE).catch(() => {});
      },
      (failure: unknown) => {
        // Other failures leave a clean menu; Start reports them if they persist.
        if (isNetwork(failure)) setError(errorMessage(failure));
        setScreen({ kind: "menu" });
      },
    );
  }, [client, handshake]);

  useEffect(() => {
    void assets.then(() => setLoaded(true));
  }, [assets]);

  const ready = loaded && screen.kind !== "loading";
  useEffect(() => {
    if (ready) hideSplash();
  }, [ready]);

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
      .start({ ...chosen, playMode })
      .then((update) => setScreen({ kind: "dice_off", update }), fail)
      .finally(() => setStarting(false));
  };

  const changePlayMode = (next: PlayMode) => {
    setPlayMode(next);
    client.setPlayMode(next).catch(gameFailed);
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
  const closeHelp = useCallback(() => setHelp(false), []);
  const stale = health !== null && health.version !== version;
  const dev = health?.dev_mode ? { strategies: health.strategies ?? [] } : null;

  if (!ready) return null;

  return (
    <>
      <header className="wood">
        <div className="title">
          <h1>{strings.title}</h1>
          {screen.kind !== "menu" && (
            <button type="button" onClick={startOver}>
              {strings.newGame}
            </button>
          )}
        </div>
        <div className="controls">
          {screen.kind === "game" && (
            <div className="play-mode">
              <Slider
                label={strings.play.label}
                options={playModes}
                value={playMode}
                onChange={changePlayMode}
              />
              <button
                type="button"
                className="help"
                aria-label={strings.play.helpLabel}
                onClick={() => setHelp(true)}
              >
                {strings.play.help}
              </button>
            </div>
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
            playMode={playMode}
            onFinished={finished}
            onError={gameFailed}
          />
        )}
        {screen.kind === "victory" && (
          <Victory game={screen.game} onAgain={() => setScreen({ kind: "menu" })} />
        )}
      </main>
      {rules && <RulesBooklet onClose={closeRules} />}
      {help && <PlayHelp onClose={closeHelp} />}
    </>
  );
}
