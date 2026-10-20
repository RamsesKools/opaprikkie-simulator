import { strings } from "../lib/strings.ts";
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
  onThrow?: () => void;
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
  onThrow,
}: Props) {
  return (
    <div className="table">
      <div className="throwing">
        <Stack count={hand} player={player} {...(onThrow && { onThrow })} />
        <div className="throw-area felt">
          <Dice values={dice} player={player} setAside={setAside} rollKey={rollKey} slots={slots} />
        </div>
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
