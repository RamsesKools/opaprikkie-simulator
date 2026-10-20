import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Board } from "../components/board.tsx";
import { Table } from "../components/table.tsx";
import { TOP_ROW, type Game, type GameClient, type GameUpdate, type Pegs } from "../game/model.ts";
import { errorMessage } from "../game/errors.ts";
import { takeMatches } from "../game/matching.ts";
import { bowl, buildScenes, throwKey, type Scene } from "../game/scenes.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

const emptyPegs = (pegs: Pegs[]): Pegs[] =>
  pegs.map((board) => Object.fromEntries(Object.keys(board).map((target) => [target, 0])));

type Playback = { game: Game; scenes: Scene[]; index: number };

const nextScene = (playback: Playback): Playback => ({ ...playback, index: playback.index + 1 });

type Props = {
  client: GameClient;
  initial: GameUpdate;
  autoPlay: boolean;
  hints: boolean;
  onFinished: (game: Game) => void;
  onError: (error: unknown) => void;
};

export function GameScreen({ client, initial, autoPlay, hints, onFinished, onError }: Props) {
  const [playback, setPlayback] = useState<Playback>(() => ({
    game: initial.game,
    scenes: buildScenes(emptyPegs(initial.game.pegs), initial.logs, initial.game),
    index: 0,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  // A pick can land after New Game has left this screen.
  const mounted = useRef(false);
  const { game, scenes, index } = playback;
  const scene = scenes[index];
  const observation = game.observation;
  const sequence = observation?.sequence ?? null;
  const player = scene?.player ?? observation?.seat ?? 0;
  const name = game.names[player]!;
  const human = game.controllers[player] === "human";
  const choosing =
    !scene &&
    (game.phase === "choosing_target" || game.phase === "choosing_dice") &&
    observation !== null;
  const waiting = !autoPlay && human && scene?.ready === true;
  const humanChoice = choosing && !busy && human && !waiting;
  const manual = humanChoice && !autoPlay;
  const autoTake = humanChoice && autoPlay && sequence !== null;

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
    const timer = setTimeout(() => setPlayback(nextScene), scene.ms);
    return () => clearTimeout(timer);
  }, [scene, waiting, game, onFinished]);

  // Throws on the table before the answer; their replay starts at the last one.
  const thrown = (sequence?.rolls.length ?? 0) + 1;

  const respond = (request: () => Promise<GameUpdate>) => {
    setHovered(null);
    setBusy(true);
    setError(null);
    request().then(
      (update) => {
        if (!mounted.current) return;
        const next = buildScenes(game.pegs, update.logs, update.game, thrown);
        setPlayback({ game: update.game, scenes: next, index: 0 });
        setSelected([]);
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
  const pick = (target: number) => respond(() => client.chooseTarget(target));
  const take = (target: number, dice: number[]) => respond(() => client.take(target, dice));
  const stop = () => respond(() => client.stop());

  const locked = autoTake ? observation.legal_targets[0] : undefined;
  const takeAll = useEffectEvent(take);
  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => takeAll(locked.target, locked.set_aside));
    return () => clearTimeout(timer);
  }, [locked]);

  const toggle = (die: number) =>
    setSelected((current) =>
      current.includes(die)
        ? current.filter((other) => other !== die)
        : [...current, die].toSorted((a, b) => a - b),
    );

  const pegs = scene?.pegs ?? game.pegs;
  const own = pegs[player]!;
  const targets = Object.keys(own).map(Number);
  const taken = sequence?.matches ?? 0;
  const dice = sequence?.dice ?? observation?.opening_roll ?? [];
  const values = selected.map((die) => dice[die]!);
  const options = manual
    ? targets
        .filter((target) => !sequence || target === sequence.target)
        .map((target) => ({ target, matches: takeMatches(target, values) }))
        .filter(({ target, matches }) => matches > 0 && own[target]! + taken < TOP_ROW)
    : [];
  const legal = humanChoice ? observation.legal_targets.map(({ target }) => target) : [];

  let lit: number[] = [];
  let preview: { target: number; row: number } | undefined;
  let raised: number[] = [];
  if (manual) {
    lit = options.map(({ target }) => target);
    raised = selected;
    const matches = hovered === null ? 0 : takeMatches(hovered, values);
    if (hovered !== null && matches > 0) {
      preview = { target: hovered, row: Math.min(own[hovered]! + taken + matches, TOP_ROW) };
    }
  } else if (humanChoice && hints) {
    lit = legal;
    const hint = observation.legal_targets.find(({ target }) => target === hovered);
    if (hint) {
      raised = hint.set_aside;
      preview = { target: hint.target, row: own[hint.target]! + hint.guaranteed_moves };
    }
  }
  const onPick = manual ? (target: number) => take(target, selected) : pick;

  let message = scene?.message ?? "";
  if (humanChoice) message = strings.game.pick(name);
  if (manual) {
    message = sequence
      ? strings.game.takeMore(name, sequence.target)
      : strings.game.selectDice(name, hints);
  }
  if (waiting) message = strings.game.throwPrompt(name);
  if (error) message = error;

  return (
    <div className="game">
      <div className="status" style={seatStyle(player)}>
        <p className="turn">{strings.game.turn(scene?.turn ?? observation?.turn ?? 0, name)}</p>
        {scene ? (
          <Table
            player={player}
            dice={scene.dice}
            setAside={scene.setAside}
            rollKey={scene.throwKey}
            slots={scene.slots}
            hand={scene.hand}
            kept={scene.kept}
            count={scene.count}
            target={scene.target}
            {...(waiting && { onThrow: () => setPlayback(nextScene) })}
          />
        ) : (
          <Table
            player={player}
            dice={choosing ? dice : []}
            setAside={raised}
            rollKey={
              observation
                ? throwKey(observation.turn, observation.continuation, sequence?.rolls.length ?? 0)
                : ""
            }
            hand={0}
            kept={sequence ? bowl(sequence.rolls, sequence.reset) : []}
            count={taken}
            target={sequence?.target ?? null}
            {...(manual && { onToggle: toggle })}
          />
        )}
        <div className="takes">
          {hints &&
            options.map(({ target, matches }) => (
              <button
                key={target}
                type="button"
                className="primary"
                onClick={() => take(target, selected)}
              >
                {strings.game.take(matches, target)}
              </button>
            ))}
          {manual && sequence && (
            <button type="button" onClick={stop}>
              {strings.game.stop}
            </button>
          )}
        </div>
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
            highlight={seat === player ? (scene?.target ?? sequence?.target ?? null) : null}
            {...(humanChoice && seat === player
              ? {
                  legal: hints ? lit : [],
                  pickable: hints ? lit : targets,
                  onPick,
                  onHover: setHovered,
                  preview,
                }
              : {})}
          />
        ))}
      </div>
    </div>
  );
}
