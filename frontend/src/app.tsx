import { useCallback, useState } from "react";
import { RulesBooklet } from "./components/rules_booklet.tsx";
import { createFixtureClient } from "./game/fixture_client.ts";
import type { Game, GameClient, GameSetup, GameUpdate } from "./game/model.ts";
import { strings } from "./lib/strings.ts";
import { DiceOff } from "./screens/dice_off.tsx";
import { GameScreen } from "./screens/game_screen.tsx";
import { Menu } from "./screens/menu.tsx";
import { Victory } from "./screens/victory.tsx";

type Screen =
  | { kind: "menu" }
  | { kind: "dice_off"; update: GameUpdate }
  | { kind: "game"; update: GameUpdate }
  | { kind: "victory"; game: Game };

type Props = { createClient?: () => GameClient };

export function App({ createClient = createFixtureClient }: Props) {
  const [client, setClient] = useState<GameClient | null>(null);
  const [screen, setScreen] = useState<Screen>({ kind: "menu" });
  const [setup, setSetup] = useState<GameSetup | null>(null);
  const [rules, setRules] = useState(false);
  const [failed, setFailed] = useState(false);
  const [starting, setStarting] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);

  const start = (chosen: GameSetup) => {
    const fresh = createClient();
    setClient(fresh);
    setSetup(chosen);
    setFailed(false);
    setStarting(true);
    fresh
      .start(chosen)
      .then(
        (update) => setScreen({ kind: "dice_off", update }),
        () => setFailed(true),
      )
      .finally(() => setStarting(false));
  };

  const play = useCallback((update: GameUpdate) => setScreen({ kind: "game", update }), []);
  const chooseFirst = async (player: number) => {
    setFailed(false);
    try {
      play(await client!.chooseFirstPlayer(player));
      return true;
    } catch {
      setFailed(true);
      return false;
    }
  };
  const finished = useCallback((game: Game) => setScreen({ kind: "victory", game }), []);
  const closeRules = useCallback(() => setRules(false), []);

  return (
    <>
      <header className="wood">
        <h1>{strings.title}</h1>
        <button type="button" onClick={() => setRules(true)}>
          {strings.rules}
        </button>
      </header>
      <main>
        {failed && <p role="alert">{strings.game.error}</p>}
        {screen.kind === "menu" && (
          <Menu
            initial={setup}
            autoPlay={autoPlay}
            pending={starting}
            onAutoPlay={setAutoPlay}
            onStart={start}
          />
        )}
        {screen.kind === "dice_off" && (
          <DiceOff update={screen.update} onChooseFirst={chooseFirst} onAiStarts={play} />
        )}
        {screen.kind === "game" && client && (
          <GameScreen
            client={client}
            initial={screen.update}
            autoPlay={autoPlay}
            onFinished={finished}
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
