import type { CSSProperties } from "react";
import { TOP_ROW, type Pegs } from "../game/model.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type Props = {
  player: number;
  name: string;
  pegs: Pegs;
  active?: boolean;
  legal?: number[];
  highlight?: number | null;
  onPick?: (target: number) => void;
};

const rows = Array.from({ length: TOP_ROW + 1 }, (_, row) => TOP_ROW - row);

export function Board({
  player,
  name,
  pegs,
  active = false,
  legal = [],
  highlight,
  onPick,
}: Props) {
  const targets = Object.keys(pegs)
    .map(Number)
    .toSorted((a, b) => a - b);
  return (
    <section
      className={active ? "board active" : "board"}
      style={seatStyle(player)}
      aria-label={strings.game.board(name)}
    >
      <h2>{name}</h2>
      <div className="columns">
        {targets.map((target) => {
          const row = pegs[target]!;
          const pickable = legal.includes(target) && onPick !== undefined;
          const classes = ["column"];
          if (pickable) classes.push("legal");
          if (highlight === target) classes.push("highlight");
          if (row === TOP_ROW) classes.push("topped");
          return (
            <button
              key={target}
              type="button"
              className={classes.join(" ")}
              disabled={!pickable}
              aria-label={strings.game.column(target, row)}
              onClick={() => onPick?.(target)}
            >
              {rows.map((cell) => (
                <span key={cell} className="hole" />
              ))}
              <span className="peg" style={{ "--row": row } as CSSProperties} />
              <span className="label">{target}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
