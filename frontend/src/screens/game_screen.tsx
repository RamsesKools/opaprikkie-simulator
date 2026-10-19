import { useEffect, useState } from "react";
import { Board } from "../components/board.tsx";
import { Table } from "../components/table.tsx";
import type { Game, GameClient, GameUpdate, Pegs } from "../game/model.ts";
import { buildScenes, type Scene } from "../game/scenes.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

const emptyPegs = (pegs: Pegs[]): Pegs[] =>
  pegs.map((board) => Object.fromEntries(Object.keys(board).map((target) => [target, 0])));

type Playback = { game: Game; scenes: Scene[]; index: number; thrown: boolean };

type Props = {
  client: GameClient;
  initial: GameUpdate;
  autoPlay: boolean;
  onFinished: (game: Game) => void;
};

export function GameScreen({ client, initial, autoPlay, onFinished }: Props) {
  const [playback, setPlayback] = useState<Playback>(() => ({
    game: initial.game,
    scenes: buildScenes(emptyPegs(initial.game.pegs), initial.logs, initial.game),
    index: 0,
    thrown: false,
  }));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [hovered, setHovered] = useState<number | null>(null);
  const { game, scenes, index } = playback;
  const scene = scenes[index];
  const observation = game.observation;
  const player = scene?.player ?? observation?.seat ?? 0;
  const name = game.names[player]!;
  const human = game.controllers[player] === "human";
  const choosing = !scene && game.phase === "choosing_target" && observation !== null;
  const waiting = !autoPlay && human && !playback.thrown && (scene ? scene.fresh : choosing);

  useEffect(() => {
    if (!scene) {
      if (game.phase === "finished") onFinished(game);
      return;
    }
    if (waiting) return;
    const timer = setTimeout(
      () => setPlayback((current) => ({ ...current, index: current.index + 1, thrown: false })),
      scene.ms,
    );
    return () => clearTimeout(timer);
  }, [scene, waiting, game, onFinished]);

  const pick = (target: number) => {
    setHovered(null);
    setBusy(true);
    setFailed(false);
    client.chooseTarget(target).then(
      (update) => {
        const next = buildScenes(game.pegs, update.logs, update.game);
        setPlayback({ game: update.game, scenes: next, index: 0, thrown: false });
        setBusy(false);
      },
      () => {
        setFailed(true);
        setBusy(false);
      },
    );
  };

  const humanChoice = choosing && !busy && human && !waiting;
  const pegs = scene?.pegs ?? game.pegs;
  const hint = humanChoice
    ? observation.legal_targets.find(({ target }) => target === hovered)
    : undefined;
  let message = scene?.message ?? "";
  if (humanChoice) message = strings.game.pick(name);
  if (waiting) message = strings.game.throwPrompt(name);
  if (failed) message = strings.game.error;

  return (
    <div className="game">
      <div className="status" style={seatStyle(player)}>
        <p className="turn">{strings.game.turn(scene?.turn ?? observation?.turn ?? 0, name)}</p>
        {waiting ? (
          <Table
            player={player}
            dice={[]}
            setAside={[]}
            rollKey=""
            kept={scene?.kept ?? []}
            count={scene?.count ?? 0}
            target={scene?.target ?? null}
            onThrow={() => setPlayback((current) => ({ ...current, thrown: true }))}
          />
        ) : scene ? (
          <Table
            player={player}
            dice={scene.dice}
            setAside={scene.setAside}
            rollKey={`${index}`}
            kept={scene.kept}
            count={scene.count}
            target={scene.target}
          />
        ) : (
          <Table
            player={player}
            dice={choosing ? observation.opening_roll : []}
            setAside={hint?.set_aside ?? []}
            rollKey={`${observation?.turn}:${observation?.continuation}`}
            kept={[]}
            count={0}
            target={null}
          />
        )}
        <p className="message" aria-live="polite">
          <span className={waiting ? "info" : (scene?.tone ?? "info")} key={message}>
            {message}
          </span>
        </p>
      </div>
      <div className="boards">
        {pegs.map((board, seat) => (
          <Board
            key={seat}
            player={seat}
            name={game.names[seat]!}
            pegs={board}
            active={seat === player}
            highlight={seat === player ? (scene?.target ?? null) : null}
            {...(humanChoice && seat === player
              ? {
                  legal: observation.legal_targets.map(({ target }) => target),
                  onPick: pick,
                  onHover: setHovered,
                  preview: hint && {
                    target: hint.target,
                    row: board[hint.target]! + hint.guaranteed_moves,
                  },
                }
              : {})}
          />
        ))}
      </div>
    </div>
  );
}
