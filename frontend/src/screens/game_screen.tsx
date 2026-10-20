import { useEffect, useRef, useState } from "react";
import { Board } from "../components/board.tsx";
import { Table } from "../components/table.tsx";
import type { Game, GameClient, GameUpdate, Pegs } from "../game/model.ts";
import { errorMessage } from "../game/errors.ts";
import { buildScenes, openingKey, type Scene } from "../game/scenes.ts";
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
  onError: (error: unknown) => void;
};

export function GameScreen({ client, initial, autoPlay, onFinished, onError }: Props) {
  const [playback, setPlayback] = useState<Playback>(() => ({
    game: initial.game,
    scenes: buildScenes(emptyPegs(initial.game.pegs), initial.logs, initial.game),
    index: 0,
    thrown: autoPlay,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  // A pick can land after New Game has left this screen.
  const mounted = useRef(false);
  const { game, scenes, index } = playback;
  const scene = scenes[index];
  const observation = game.observation;
  const player = scene?.player ?? observation?.seat ?? 0;
  const name = game.names[player]!;
  const human = game.controllers[player] === "human";
  const choosing = !scene && game.phase === "choosing_target" && observation !== null;
  const waiting = !autoPlay && human && !playback.thrown && (scene ? scene.fresh : choosing);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!scene) {
      if (game.phase === "finished") onFinished(game);
      return;
    }
    if (waiting) return;
    const timer = setTimeout(
      () => setPlayback((current) => ({ ...current, index: current.index + 1, thrown: autoPlay })),
      scene.ms,
    );
    return () => clearTimeout(timer);
  }, [scene, waiting, autoPlay, game, onFinished]);

  const pick = (target: number) => {
    setHovered(null);
    setBusy(true);
    setError(null);
    client.chooseTarget(target).then(
      (update) => {
        if (!mounted.current) return;
        const next = buildScenes(game.pegs, update.logs, update.game);
        setPlayback({ game: update.game, scenes: next, index: 0, thrown: autoPlay });
        setBusy(false);
      },
      (failure: unknown) => {
        if (!mounted.current) return;
        setError(errorMessage(failure));
        setBusy(false);
        onError(failure);
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
  if (error) message = error;

  return (
    <div className="game">
      <div className="status" style={seatStyle(player)}>
        <p className="turn">{strings.game.turn(scene?.turn ?? observation?.turn ?? 0, name)}</p>
        {waiting ? (
          <Table
            player={player}
            showStack
            dice={[]}
            setAside={[]}
            rollKey=""
            hand={scene?.dice.length ?? observation?.opening_roll.length ?? 0}
            kept={scene?.kept ?? []}
            count={scene?.count ?? 0}
            target={scene?.target ?? null}
            onThrow={() => setPlayback((current) => ({ ...current, thrown: true }))}
          />
        ) : scene ? (
          <Table
            player={player}
            showStack={false}
            dice={scene.dice}
            setAside={scene.setAside}
            rollKey={scene.throwKey}
            slots={scene.slots}
            hand={scene.hand}
            kept={scene.kept}
            count={scene.count}
            target={scene.target}
          />
        ) : (
          <Table
            player={player}
            showStack={false}
            dice={choosing ? observation.opening_roll : []}
            setAside={hint?.set_aside ?? []}
            rollKey={observation ? openingKey(observation.turn, observation.continuation) : ""}
            hand={choosing ? observation.opening_roll.length - (hint?.set_aside.length ?? 0) : 0}
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
        {game.seed !== null && (
          <p className="dev">
            <span>{strings.game.seed(game.seed)}</span>
            {game.strategy !== null && <span>{strings.game.strategy(game.strategy)}</span>}
          </p>
        )}
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
