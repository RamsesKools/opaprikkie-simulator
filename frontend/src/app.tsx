import { useCallback, useEffect, useState } from "react";
import { RulesBooklet } from "./components/rules_booklet.tsx";
import type { Game, GameClient, GameSetup, GameUpdate, Health, Session } from "./game/model.ts";
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

function prefill({ names, game }: Session): GameSetup | null {
  if (names?.length !== 2) return null;
  const mode = game && !game.controllers.includes("ai") ? "hot_seat" : "versus_ai";
  return { mode, names: [names[0]!, names[1]!] };
}

type Props = { client: GameClient };

export function App({ client }: Props) {
  const [screen, setScreen] = useState<Screen>({ kind: "loading" });
  const [setup, setSetup] = useState<GameSetup | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [rules, setRules] = useState(false);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  // Runs again after every failure, so a redeploy behind an open tab shows the reload banner.
  const handshake = useCallback(() => {
    client.health().then(setHealth, () => {});
  }, [client]);

  useEffect(() => {
    handshake();
    client
      .session()
      .then(
        (session) => setSetup(prefill(session)),
        () => setSetup(null),
      )
      .finally(() => setScreen({ kind: "menu" }));
  }, [client, handshake]);

  const fail = useCallback(() => {
    setFailed(true);
    handshake();
  }, [handshake]);

  const start = (chosen: GameSetup) => {
    setSetup(chosen);
    setFailed(false);
    setStarting(true);
    client
      .start(chosen)
      .then((update) => setScreen({ kind: "dice_off", update }), fail)
      .finally(() => setStarting(false));
  };

  const play = useCallback((update: GameUpdate) => setScreen({ kind: "game", update }), []);
  const chooseFirst = async (player: number) => {
    setFailed(false);
    try {
      play(await client.chooseFirstPlayer(player));
      return true;
    } catch {
      fail();
      return false;
    }
  };
  const finished = useCallback((game: Game) => setScreen({ kind: "victory", game }), []);
  const closeRules = useCallback(() => setRules(false), []);
  const stale = health !== null && health.version !== version;
  const dev = health?.dev_mode ? { strategies: health.strategies ?? [] } : null;

  return (
    <>
      <header className="wood">
        <h1>{strings.title}</h1>
        <div className="controls">
          {screen.kind === "game" && (
            <label className="auto-play">
              <input
                type="checkbox"
                checked={autoPlay}
                onChange={(event) => setAutoPlay(event.target.checked)}
              />
              {strings.autoPlay}
            </label>
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
        {failed && <p role="alert">{strings.game.error}</p>}
        {screen.kind === "menu" && (
          <Menu initial={setup} dev={dev} pending={starting} onStart={start} />
        )}
        {screen.kind === "dice_off" && (
          <DiceOff update={screen.update} onChooseFirst={chooseFirst} onAiStarts={play} />
        )}
        {screen.kind === "game" && (
          <GameScreen
            client={client}
            initial={screen.update}
            autoPlay={autoPlay}
            onFinished={finished}
            onError={handshake}
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
