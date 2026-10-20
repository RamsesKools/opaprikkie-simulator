import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

const pips: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

export function Pips({ value }: { value: number }) {
  return Array.from({ length: 9 }, (_, cell) => (
    <span key={cell} className={pips[value]?.includes(cell) ? "pip on" : "pip"} />
  ));
}

type Props = {
  values: number[];
  player: number;
  setAside?: number[];
  rollKey?: string;
  /** Keys for the dice, so dice taken away don't remount the rest. */
  slots?: number[];
  label?: string;
};

export function Dice({ values, player, setAside = [], rollKey = "", slots, label }: Props) {
  return (
    <div
      className="dice"
      role="img"
      aria-label={label ?? strings.game.dice(values)}
      style={seatStyle(player)}
    >
      {values.map((value, index) => (
        <span
          key={`${rollKey}:${slots?.[index] ?? index}`}
          className={setAside.includes(index) ? "die set-aside" : "die"}
          style={{ animationDelay: `${index * 40}ms` }}
        >
          <Pips value={value} />
        </span>
      ))}
    </div>
  );
}
