import { useEffect, useState } from "react";
import { Board } from "../components/board.tsx";
import { Dice } from "../components/dice.tsx";
import type { GameClient, GameView, Pegs, Update } from "../game/model.ts";
import { buildScenes, type Scene } from "../game/scenes.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

const emptyPegs = (pegs: Pegs[]): Pegs[] =>
  pegs.map((board) => Object.fromEntries(Object.keys(board).map((target) => [target, 0])));

type Playback = { view: GameView; scenes: Scene[]; index: number };

type Props = {
  client: GameClient;
  initial: Update;
  onFinished: (view: GameView) => void;
};

export function GameScreen({ client, initial, onFinished }: Props) {
  const [playback, setPlayback] = useState<Playback>(() => ({
    view: initial.state,
    scenes: buildScenes(emptyPegs(initial.state.pegs), initial.log, initial.state),
    index: 0,
  }));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const { view, scenes, index } = playback;
  const scene = scenes[index];

  useEffect(() => {
    if (!scene) {
      if (view.phase === "finished") onFinished(view);
      return;
    }
    const timer = setTimeout(
      () => setPlayback((current) => ({ ...current, index: current.index + 1 })),
      scene.ms,
    );
    return () => clearTimeout(timer);
  }, [scene, view, onFinished]);

  const pick = (target: number) => {
    setBusy(true);
    client.chooseTarget(target).then(
      (update) => {
        const next = buildScenes(view.pegs, update.log, update.state);
        setPlayback({ view: update.state, scenes: next, index: 0 });
        setBusy(false);
      },
      () => {
        setFailed(true);
        setBusy(false);
      },
    );
  };

  const player = scene?.player ?? view.current_player ?? 0;
  const name = view.names[player]!;
  const choosing = !scene && view.phase === "choosing_target";
  const humanChoice = choosing && !busy && view.controllers[player] === "human";
  const pegs = scene?.pegs ?? view.pegs;
  let message = scene?.message ?? "";
  if (humanChoice) message = strings.game.pick(name);
  if (failed) message = strings.game.error;

  return (
    <div className="game">
      <div className="status" style={seatStyle(player)}>
        <p className="turn">{strings.game.turn(scene?.turn ?? view.turn, name)}</p>
        <div className="tray">
          {scene ? (
            <Dice
              values={scene.dice}
              player={player}
              setAside={scene.setAside}
              rollKey={`${index}`}
            />
          ) : (
            choosing && (
              <Dice
                values={view.opening_roll}
                player={player}
                rollKey={`${view.turn}:${view.continuation}`}
              />
            )
          )}
        </div>
        <p className={`message ${scene?.tone ?? "info"}`} aria-live="polite" key={message}>
          {message}
        </p>
      </div>
      <div className="boards">
        {pegs.map((board, seat) => (
          <Board
            key={seat}
            player={seat}
            name={view.names[seat]!}
            pegs={board}
            active={seat === player}
            highlight={seat === player ? (scene?.target ?? null) : null}
            {...(humanChoice && seat === player
              ? { legal: view.legal_targets.map(({ target }) => target), onPick: pick }
              : {})}
          />
        ))}
      </div>
    </div>
  );
}
