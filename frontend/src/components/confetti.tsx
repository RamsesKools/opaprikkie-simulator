import { useEffect, type CSSProperties } from "react";
import { confettiMs } from "../game/timing.ts";
import { seatStyle } from "../lib/palette.ts";

const PIECES = 80;
// Each property walks the pieces with its own irrational step, so no two line up.
const spread = (index: number, step: number) => (index * step) % 1;
const steps = { left: 0.618034, drift: 0.414214, delay: 0.732051, fall: 0.141593, spin: 0.718282 };

type Props = { seat: number; onDone?: () => void };

/** A short burst from the top of the screen; it never takes clicks and clears itself. */
export function Confetti({ seat, onDone }: Props) {
  useEffect(() => {
    if (!onDone) return;
    const timer = setTimeout(onDone, confettiMs());
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="confetti" aria-hidden="true" style={seatStyle(seat)}>
      {Array.from({ length: PIECES }, (_, index) => (
        <span
          key={index}
          className={`piece c${index % 4}`}
          style={
            {
              "--left": `${Math.round(spread(index, steps.left) * 100)}%`,
              "--drift": `${Math.round((spread(index, steps.drift) - 0.5) * 160)}px`,
              "--delay": `${Math.round(spread(index, steps.delay) * 400)}ms`,
              "--fall": `${Math.round(900 + spread(index, steps.fall) * 600)}ms`,
              "--spin": `${Math.round(360 + spread(index, steps.spin) * 720)}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
