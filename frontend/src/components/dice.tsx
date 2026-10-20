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
  /** Makes each die a toggle button; the raised `setAside` dice are the selected ones. */
  onToggle?: (index: number) => void;
};

export function Dice({
  values,
  player,
  setAside = [],
  rollKey = "",
  slots,
  label,
  onToggle,
}: Props) {
  return (
    <div
      className="dice"
      role={onToggle ? "group" : "img"}
      aria-label={label ?? strings.game.dice(values)}
      style={seatStyle(player)}
    >
      {values.map((value, index) => {
        const props = {
          className: setAside.includes(index) ? "die set-aside" : "die",
          style: { animationDelay: `${index * 40}ms` },
        };
        const key = `${rollKey}:${slots?.[index] ?? index}`;
        return onToggle ? (
          <button
            key={key}
            type="button"
            {...props}
            aria-label={strings.game.die(value)}
            aria-pressed={setAside.includes(index)}
            onClick={() => onToggle(index)}
          >
            <Pips value={value} />
          </button>
        ) : (
          <span key={key} {...props}>
            <Pips value={value} />
          </span>
        );
      })}
    </div>
  );
}
