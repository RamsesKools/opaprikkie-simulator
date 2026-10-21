import { useEffect, useEffectEvent, useRef, useState } from "react";
import { Board } from "../components/board.tsx";
import { Table } from "../components/table.tsx";
import {
  emptyPegs,
  GameError,
  type Game,
  type GameClient,
  type GameUpdate,
} from "../game/model.ts";
import { errorMessage } from "../game/errors.ts";
import { bowl, buildScenes, throwKey, type Scene } from "../game/scenes.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type Playback = { game: Game; scenes: Scene[]; index: number };

const nextScene = (playback: Playback): Playback => ({ ...playback, index: playback.index + 1 });

const sameDice = (a: number[], b: number[]) =>
  a.length === b.length && a.every((die, index) => die === b[index]);

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
  // The game whose automatic take failed; the player finishes that sequence by hand.
  const [stalled, setStalled] = useState<Game | null>(null);
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
  const humanChoice = choosing && human && !waiting;
  const byHand = !autoPlay || (sequence !== null && stalled === game);
  const manual = humanChoice && byHand;
  const autoTake = humanChoice && !byHand && sequence !== null && !busy;

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

  const show = (next: Game, scenes: Scene[]) => {
    setPlayback({ game: next, scenes, index: 0 });
    setSelected([]);
  };

  // Another tab moved the game on, so this one catches up from the session.
  const resync = () =>
    client.session().then(
      ({ game: current }) => {
        if (mounted.current && current) show(current, buildScenes(game.pegs, [], current));
      },
      () => {},
    );

  const respond = (request: () => Promise<GameUpdate>, automatic = false) => {
    setHovered(null);
    setBusy(true);
    setError(null);
    request().then(
      (update) => {
        if (!mounted.current) return;
        show(update.game, buildScenes(game.pegs, update.logs, update.game, thrown));
        setBusy(false);
      },
      (failure: unknown) => {
        if (!mounted.current) return;
        setError(errorMessage(failure));
        setBusy(false);
        if (automatic) setStalled(game);
        if (failure instanceof GameError && failure.code === "wrong_phase") void resync();
        onError(failure);
      },
    );
  };
  const pick = (target: number) => respond(() => client.chooseTarget(target));
  const take = (target: number, dice: number[]) => respond(() => client.take(target, dice));
  const stop = () => respond(() => client.stop());

  const locked = autoTake ? observation.legal_targets[0] : undefined;
  const takeAll = useEffectEvent((target: number, dice: number[]) =>
    respond(() => client.take(target, dice), true),
  );
  useEffect(() => {
    if (!locked) return;
    const timer = setTimeout(() => takeAll(locked.target, locked.set_aside));
    return () => clearTimeout(timer);
  }, [locked]);

  const pegs = scene?.pegs ?? game.pegs;
  const own = pegs[player]!;
  const targets = Object.keys(own).map(Number);
  const dice = sequence?.dice ?? observation?.opening_roll ?? [];
  const takes = manual ? observation.takes : [];
  const options = takes.filter((option) => sameDice(option.dice, selected));
  const legal = humanChoice ? observation.legal_targets.map(({ target }) => target) : [];

  // A die only selects while the selection still fits some take.
  const toggle = (die: number) => {
    const chosen = selected.includes(die)
      ? selected.filter((other) => other !== die)
      : [...selected, die].toSorted((a, b) => a - b);
    if (!takes.some((option) => chosen.every((index) => option.dice.includes(index)))) return;
    setError(null);
    setSelected(chosen);
  };
  // With nothing selected, a lit lane selects its take with the most matches.
  const selectMost = (target: number) => {
    const most = takes
      .filter((option) => option.target === target)
      .reduce((best, option) => (option.matches > best.matches ? option : best));
    setError(null);
    setSelected(most.dice);
  };

  let lit: number[] = [];
  let raised: number[] = [];
  // Where pegs would land, one ghost per target; the pegs only move once the sequence ends.
  const landing = new Map<number, number>();
  if (sequence) landing.set(sequence.target, own[sequence.target]! + sequence.matches);
  if (manual) {
    if (selected.length) lit = options.map(({ target }) => target);
    else if (sequence) lit = [sequence.target];
    else if (hints) lit = legal;
    raised = selected;
    for (const option of options) landing.set(option.target, option.row);
  } else if (humanChoice && hints) {
    lit = legal;
    const hint = observation.legal_targets.find(({ target }) => target === hovered);
    if (hint) {
      raised = hint.set_aside;
      landing.set(hint.target, own[hint.target]! + hint.guaranteed_moves);
    }
  }
  let onPick = pick;
  if (manual) onPick = selected.length ? (target: number) => take(target, selected) : selectMost;
  const pickable = manual || hints ? lit : targets;
  const next = sequence ? options[0] : undefined;

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
            count={sequence?.matches ?? 0}
            target={sequence?.target ?? null}
            {...(manual && { onToggle: toggle, disabled: busy })}
            {...(next && {
              action: (
                <button
                  type="button"
                  className="primary"
                  disabled={busy}
                  onClick={() => take(next.target, selected)}
                >
                  {strings.game.next(next.outcome, next.next_dice, next.target)}
                </button>
              ),
            })}
          />
        )}
        <div className="actions">
          {manual && sequence && (
            <button type="button" disabled={busy} onClick={stop}>
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
            {...(seat === player && {
              landing: [...landing].map(([target, row]) => ({ target, row })),
            })}
            {...(humanChoice && seat === player
              ? {
                  legal: lit,
                  pickable: busy ? [] : pickable,
                  onPick,
                  ...(!busy && !manual && { onHover: setHovered }),
                }
              : {})}
          />
        ))}
      </div>
    </div>
  );
}
