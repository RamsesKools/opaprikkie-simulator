import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type Props = { seat: number; name: string; counts: number[]; max: number };

/** How often each face was thrown, as bars that share `max` so players compare. */
export function DiceChart({ seat, name, counts, max }: Props) {
  return (
    <figure
      className="dice-chart"
      style={seatStyle(seat)}
      role="img"
      aria-label={strings.victory.chart(name, counts)}
    >
      <figcaption>{name}</figcaption>
      <div className="faces">
        {counts.map((count, face) => (
          <div key={face} className="face">
            <span className="count">{count}</span>
            <span className="bar-area">
              <span className="bar" style={{ height: `${max ? (count / max) * 100 : 0}%` }} />
            </span>
            <span className="number">{face + 1}</span>
          </div>
        ))}
      </div>
    </figure>
  );
}
