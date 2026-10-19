import { useCallback, useEffect, useState, type CSSProperties } from "react";
import { Dice } from "../components/dice.tsx";
import type { DiceOffRound, Update } from "../game/model.ts";
import { timing } from "../game/timing.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type ThrowerProps = {
  player: number;
  name: string;
  human: boolean;
  dice: number[] | null;
  onThrow: (player: number) => void;
};

function Thrower({ player, name, human, dice, onThrow }: ThrowerProps) {
  const thrown = dice !== null;
  const [delay] = useState(() =>
    human
      ? timing.autoThrowMin + Math.random() * (timing.autoThrowMax - timing.autoThrowMin)
      : timing.aiThrow,
  );
  useEffect(() => {
    if (thrown) return;
    const timer = setTimeout(() => onThrow(player), delay);
    return () => clearTimeout(timer);
  }, [thrown, delay, player, onThrow]);

  return (
    <section className="thrower" style={seatStyle(player)}>
      <h2>{name}</h2>
      {dice ? (
        <Dice values={dice} player={player} />
      ) : (
        human && (
          <button
            type="button"
            className="throw"
            style={{ "--auto-press": `${delay}ms` } as CSSProperties}
            onClick={() => onThrow(player)}
          >
            <span className="fill" />
            {strings.diceOff.throw}
          </button>
        )
      )}
    </section>
  );
}

type Props = {
  update: Update;
  onChooseFirst: (player: number) => void;
  onAiStarts: (update: Update) => void;
};

export function DiceOff({ update, onChooseFirst, onAiStarts }: Props) {
  const { state } = update;
  const rounds = update.log.filter((entry): entry is DiceOffRound => entry.kind === "dice_off");
  const [round, setRound] = useState(0);
  const [thrown, setThrown] = useState<number[]>([]);
  const [chosen, setChosen] = useState(false);
  const rolls = rounds[round]?.rolls ?? [];
  const roundDone = rolls.every(({ player }) => thrown.includes(player));
  const last = round >= rounds.length - 1;
  const humanChooses = state.phase === "choosing_first_player";
  const throwFor = useCallback(
    (player: number) => setThrown((done) => (done.includes(player) ? done : [...done, player])),
    [],
  );

  useEffect(() => {
    if (!roundDone || (last && humanChooses)) return;
    const timer = setTimeout(() => {
      if (last) {
        onAiStarts(update);
      } else {
        setRound(round + 1);
        setThrown([]);
      }
    }, timing.diceOffResult);
    return () => clearTimeout(timer);
  }, [roundDone, last, humanChooses, round, update, onAiStarts]);

  let message: string = strings.diceOff.explain;
  if (roundDone && !last) {
    message = strings.diceOff.tie(rolls.map(({ player }) => state.names[player]!));
  } else if (roundDone && humanChooses) {
    message = strings.diceOff.wins(state.names[state.current_player!]!);
  } else if (roundDone) {
    const ai = state.controllers.indexOf("ai");
    message = strings.diceOff.aiStarts(state.names[ai]!);
  }

  return (
    <div className="dice-off">
      <h2>{strings.diceOff.title}</h2>
      <p className="message" aria-live="polite">
        {message}
      </p>
      <div className="throwers">
        {rolls.map(({ player, dice }) => (
          <Thrower
            key={`${round}:${player}`}
            player={player}
            name={state.names[player]!}
            human={state.controllers[player] === "human"}
            dice={thrown.includes(player) ? dice : null}
            onThrow={throwFor}
          />
        ))}
      </div>
      {roundDone && last && humanChooses && (
        <div className="choices">
          <p>{strings.diceOff.whoStarts}</p>
          {state.names.map((name, player) => (
            <button
              key={player}
              type="button"
              className="primary"
              style={seatStyle(player)}
              disabled={chosen}
              onClick={() => {
                setChosen(true);
                onChooseFirst(player);
              }}
            >
              {strings.diceOff.starts(name)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
