import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { Board } from "../components/board.tsx";
import { Confetti } from "../components/confetti.tsx";
import { Table } from "../components/table.tsx";
import {
  emptyPegs,
  GameError,
  TOP_ROW,
  type Game,
  type GameClient,
  type GameUpdate,
  type PlayMode,
} from "../game/model.ts";
import { errorMessage } from "../game/errors.ts";
import { bowl, buildScenes, throwKey, type Scene } from "../game/scenes.ts";
import { useSeatStyle } from "../lib/seat_colours.ts";
import { useStrings } from "../lib/language.ts";

type Playback = { game: Game; scenes: Scene[]; index: number };

const nextScene = (playback: Playback): Playback => ({ ...playback, index: playback.index + 1 });

const sameDice = (a: number[], b: number[]) =>
  a.length === b.length && a.every((die, index) => die === b[index]);

type Props = {
  client: GameClient;
  initial: GameUpdate;
  playMode: PlayMode;
  onFinished: (game: Game) => void;
  onError: (error: unknown) => void;
};

export function GameScreen({ client, initial, playMode, onFinished, onError }: Props) {
  const strings = useStrings();
  const seatStyle = useSeatStyle();
  const autoPlay = playMode === "automatic";
  const hints = playMode !== "without_hints";
  const [playback, setPlayback] = useState<Playback>(() => ({
    game: initial.game,
    scenes: buildScenes(emptyPegs(initial.game.pegs), initial.logs, initial.game),
    index: 0,
  }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<{ cause: unknown } | null>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [confetti, setConfetti] = useState<{ id: number; seat: number } | null>(null);
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

  // A great turn bursts into confetti once as its scene starts, and the burst outlives the scene.
  const [celebrated, setCelebrated] = useState<Scene | undefined>();
  if (scene?.great && scene !== celebrated) {
    setCelebrated(scene);
    setConfetti((burst) => ({ id: (burst?.id ?? 0) + 1, seat: scene.player }));
  }
  const clearConfetti = useCallback(() => setConfetti(null), []);

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

  const respond = (request: () => Promise<GameUpdate>, automatic = false, stopped = false) => {
    setHovered(null);
    setBusy(true);
    setError(null);
    request().then(
      (update) => {
        if (!mounted.current) return;
        show(update.game, buildScenes(game.pegs, update.logs, update.game, thrown, stopped));
        setBusy(false);
      },
      (failure: unknown) => {
        if (!mounted.current) return;
        setError({ cause: failure });
        setBusy(false);
        if (automatic) setStalled(game);
        if (failure instanceof GameError && failure.code === "wrong_phase") void resync();
        onError(failure);
      },
    );
  };
  const pick = (target: number) => respond(() => client.chooseTarget(target));
  const take = (target: number, dice: number[]) => respond(() => client.take(target, dice));
  const stop = () => respond(() => client.stop(), false, true);

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
  const dice = sequence?.dice ?? observation?.opening_roll ?? [];
  const takes = manual ? observation.takes : [];
  const options = takes.filter((option) => sameDice(option.dice, selected));
  const mostFor = (target: number) =>
    takes
      .filter((option) => option.target === target)
      .reduce((best, option) => (option.matches > best.matches ? option : best));
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
    setError(null);
    setSelected(mostFor(target).dice);
  };

  let lit: number[] = [];
  let raised: number[] = [];
  // Where pegs would land, one ghost per target; the pegs only move once the sequence ends.
  const landing = new Map<number, number>();
  if (sequence) landing.set(sequence.target, own[sequence.target]! + sequence.matches);
  else if (scene && !scene.moved && scene.target !== null && scene.count > 0) {
    landing.set(scene.target, Math.min(own[scene.target]! + scene.count, TOP_ROW));
  }
  if (manual) {
    if (sequence) lit = [sequence.target];
    else if (selected.length) lit = options.map(({ target }) => target);
    else if (hints) lit = legal;
    raised = selected;
    for (const option of options) landing.set(option.target, option.row);
    // With hints, hovering a lit lane previews taking its most matches at once.
    if (hints && !selected.length && hovered !== null && lit.includes(hovered)) {
      landing.set(hovered, mostFor(hovered).row);
    }
  } else if (humanChoice) {
    lit = legal;
    const hint = observation.legal_targets.find(({ target }) => target === hovered);
    if (hint) {
      raised = hint.set_aside;
      landing.set(hint.target, own[hint.target]! + hint.guaranteed_moves);
    }
  }
  let onPick = pick;
  // With hints and nothing selected, a lit lane takes its most matches at once. Otherwise a lane
  // that can't take the selection as it is selects its most matches instead.
  if (manual) {
    onPick = (target: number) => {
      if (options.some((option) => option.target === target)) take(target, selected);
      else if (hints && !selected.length) take(target, mostFor(target).dice);
      else selectMost(target);
    };
  }
  const next = sequence ? options[0] : undefined;
  const choices = sequence ? [] : options;

  let message = scene?.message(strings) ?? "";
  if (humanChoice) message = strings.game.pick(name);
  if (manual) {
    message = sequence
      ? strings.game.takeMore(name, sequence.target)
      : strings.game.selectDice(name, hints);
  }
  if (waiting) message = strings.game.throwPrompt(name);
  if (scene?.popup && scene.tone === "oh_no") message = "";
  if (error) message = errorMessage(error.cause, strings);

  return (
    <div className="game">
      {confetti && <Confetti key={confetti.id} seat={confetti.seat} onDone={clearConfetti} />}
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
            {...(scene.combo !== undefined && { combo: scene.combo })}
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
            {...(sequence && sequence.rolls.length >= 2 && { combo: sequence.rolls.length + 1 })}
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
            {...(choices.length > 0 && {
              action: choices.map((option) => (
                <button
                  key={option.target}
                  type="button"
                  className="primary choice"
                  disabled={busy}
                  onClick={() => take(option.target, selected)}
                >
                  <span>{strings.game.choose(option.matches, option.target)}</span>{" "}
                  <span className="then">
                    {strings.game.chooseNext(option.outcome, option.next_dice)}
                  </span>
                </button>
              )),
            })}
          />
        )}
        <div className="actions">
          {scene?.popup && (
            <div
              className={scene.tone === "oh_no" ? "popup oh-no" : "popup"}
              role="status"
              onClick={() => setPlayback(nextScene)}
            >
              {scene.popup(strings)}
            </div>
          )}
          {manual && sequence && (
            <button type="button" disabled={busy} onClick={stop}>
              {strings.game.endTurn}
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
                  pickable: busy ? [] : lit,
                  onPick,
                  ...(!busy && (!manual || (hints && !sequence)) && { onHover: setHovered }),
                }
              : {})}
          />
        ))}
      </div>
    </div>
  );
}
