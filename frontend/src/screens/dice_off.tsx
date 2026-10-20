import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Dice } from "../components/dice.tsx";
import { Stack } from "../components/stack.tsx";
import type { DiceOffRound, GameUpdate } from "../game/model.ts";
import { timing } from "../game/timing.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type ThrowerProps = {
  player: number;
  name: string;
  human: boolean;
  dice: number[];
  thrown: boolean;
  won: boolean;
  onThrow: (player: number) => void;
};

function Thrower({ player, name, human, dice, thrown, won, onThrow }: ThrowerProps) {
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
    <section className={won ? "thrower won" : "thrower"} style={seatStyle(player)}>
      <h2>{name}</h2>
      <div className="throwing">
        {human && !thrown ? (
          <Stack
            count={dice.length}
            player={player}
            onThrow={() => onThrow(player)}
            autoPress={delay}
          />
        ) : (
          <Stack count={thrown ? 0 : dice.length} player={player} />
        )}
        <div className="throw-area felt">{thrown && <Dice values={dice} player={player} />}</div>
      </div>
    </section>
  );
}

type Props = {
  update: GameUpdate;
  onChooseFirst: (player: number) => Promise<boolean>;
  onAiStarts: (update: GameUpdate) => void;
};

export function DiceOff({ update, onChooseFirst, onAiStarts }: Props) {
  const { game } = update;
  const rounds = update.logs.filter((entry): entry is DiceOffRound => entry.kind === "dice_off");
  const [round, setRound] = useState(0);
  const [thrown, setThrown] = useState<number[]>([]);
  const [chosen, setChosen] = useState(false);
  const rolls = rounds[round]?.rolls ?? [];
  const roundDone = rolls.every(({ player }) => thrown.includes(player));
  const last = round >= rounds.length - 1;
  const humanChooses = game.phase === "choosing_first_player";
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

  let winner: number | null = null;
  if (roundDone && last) {
    winner = humanChooses ? game.observation!.seat : game.controllers.indexOf("ai");
  }
  let message: ReactNode = strings.diceOff.explain;
  if (roundDone && !last) {
    message = strings.diceOff.tie(rolls.map(({ player }) => game.names[player]!));
  } else if (winner !== null) {
    const text = humanChooses ? strings.diceOff.wins : strings.diceOff.aiStarts;
    const [before, after] = text("\0").split("\0");
    message = (
      <>
        {before}
        <strong className="winner-name" style={seatStyle(winner)}>
          {game.names[winner]}
        </strong>
        {after}
      </>
    );
  }

  return (
    <div className="dice-off">
      <h2>{strings.diceOff.title}</h2>
      <p className="message" aria-live="polite">
        {message}
      </p>
      {winner !== null && humanChooses && (
        <div className="choices">
          <p>{strings.diceOff.whoStarts}</p>
          {game.names.map((name, player) => (
            <button
              key={player}
              type="button"
              className="primary"
              style={seatStyle(player)}
              disabled={chosen}
              onClick={() => {
                setChosen(true);
                void onChooseFirst(player).then((ok) => setChosen(ok));
              }}
            >
              {strings.diceOff.starts(name)}
            </button>
          ))}
        </div>
      )}
      <div className="throwers">
        {rolls.map(({ player, dice }) => (
          <Thrower
            key={`${round}:${player}`}
            player={player}
            name={game.names[player]!}
            human={game.controllers[player] === "human"}
            dice={dice}
            thrown={thrown.includes(player)}
            won={player === winner}
            onThrow={throwFor}
          />
        ))}
      </div>
    </div>
  );
}
