import type { CSSProperties } from "react";
import { useSeatStyle } from "../lib/seat_colours.ts";
import { strings } from "../lib/strings.ts";
import { Pips } from "./dice.tsx";

const pyramids: Record<number, number[]> = {
  1: [1],
  2: [1, 1],
  3: [1, 2],
  4: [2, 2],
  5: [2, 3],
  6: [1, 2, 3],
};

const faces = [5, 2, 6, 3, 1, 4];

type Props = {
  count: number;
  player: number;
  onThrow?: () => void;
  /** Milliseconds until the throw presses itself, shown as a filling bar. */
  autoPress?: number;
};

export function Stack({ count, player, onThrow, autoPress }: Props) {
  const style = useSeatStyle()(player);
  if (count === 0) return <div className="stack" aria-hidden="true" style={style} />;
  const rows = pyramids[count] ?? [];
  const pile = rows.map((width, row) => {
    const first = rows.slice(0, row).reduce((sum, above) => sum + above, 0);
    return (
      <span key={row} className="stack-row">
        {Array.from({ length: width }, (_, index) => (
          <span key={index} className="die">
            <Pips value={faces[(first + index) % faces.length]!} />
          </span>
        ))}
      </span>
    );
  });
  if (!onThrow) {
    return (
      <div className="stack" role="img" aria-label={strings.game.stack(count)} style={style}>
        {pile}
      </div>
    );
  }
  return (
    <button
      type="button"
      className="stack throw"
      aria-label={strings.game.throwStack(count)}
      style={
        autoPress === undefined
          ? style
          : ({ ...style, "--auto-press": `${autoPress}ms` } as CSSProperties)
      }
      onClick={onThrow}
    >
      <span className="pile">{pile}</span>
      <span className="throw-label" aria-hidden="true">
        {strings.game.throwDice}
      </span>
      {autoPress !== undefined && <span className="fill" />}
    </button>
  );
}
