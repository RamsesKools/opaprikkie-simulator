import type { ReactNode } from "react";
import { useStrings } from "../lib/language.ts";
import { Dice } from "./dice.tsx";
import { Stack } from "./stack.tsx";

type Props = {
  player: number;
  dice: number[];
  setAside: number[];
  rollKey: string;
  slots?: number[];
  hand: number;
  kept: number[];
  count: number;
  target: number | null;
  /** Flashes "Combo xN" over the throw area for the throw at `rollKey`. */
  combo?: number;
  /** Takes the stack's place, like the button that takes the selection and throws the rest. */
  action?: ReactNode;
  onThrow?: () => void;
  onToggle?: (index: number) => void;
  disabled?: boolean;
};

export function Table({
  player,
  dice,
  setAside,
  rollKey,
  slots,
  hand,
  kept,
  count,
  target,
  combo,
  action,
  onThrow,
  onToggle,
  disabled,
}: Props) {
  const strings = useStrings();
  return (
    <div className="table">
      <div className={action ? "stack-slot action" : "stack-slot"}>
        {action ?? <Stack count={hand} player={player} {...(onThrow && { onThrow })} />}
      </div>
      <div className="throw-area felt">
        {combo !== undefined && (
          <span key={`${rollKey}:${combo}`} className="combo" aria-hidden="true">
            {strings.game.combo(combo)}
          </span>
        )}
        <Dice
          values={dice}
          player={player}
          setAside={setAside}
          rollKey={rollKey}
          slots={slots}
          buttons
          {...(onToggle && { onToggle, disabled })}
        />
      </div>
      <div className="saved">
        <div className="bowl felt">
          <Dice values={kept} player={player} label={strings.game.kept(kept)} />
        </div>
        <p className="saved-count">
          {target !== null && count > 0 ? strings.game.saved(count, target) : ""}
        </p>
      </div>
    </div>
  );
}
