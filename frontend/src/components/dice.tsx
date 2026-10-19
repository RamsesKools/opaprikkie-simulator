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

type Props = {
  values: number[];
  player: number;
  setAside?: number[];
  rollKey?: string;
  label?: string;
};

export function Dice({ values, player, setAside = [], rollKey = "", label }: Props) {
  return (
    <div
      className="dice"
      role="img"
      aria-label={label ?? strings.game.dice(values)}
      style={seatStyle(player)}
    >
      {values.map((value, index) => (
        <span
          key={`${rollKey}:${index}`}
          className={setAside.includes(index) ? "die set-aside" : "die"}
          style={{ animationDelay: `${index * 40}ms` }}
        >
          {Array.from({ length: 9 }, (_, cell) => (
            <span key={cell} className={pips[value]?.includes(cell) ? "pip on" : "pip"} />
          ))}
        </span>
      ))}
    </div>
  );
}
