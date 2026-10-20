import { strings } from "../lib/strings.ts";
import { Dice } from "./dice.tsx";

type Props = {
  player: number;
  dice: number[];
  setAside: number[];
  rollKey: string;
  kept: number[];
  count: number;
  target: number | null;
  onThrow?: () => void;
};

export function Table({ player, dice, setAside, rollKey, kept, count, target, onThrow }: Props) {
  return (
    <div className="table">
      <div className="throw-area felt">
        {onThrow ? (
          <button type="button" className="throw" onClick={onThrow}>
            {strings.game.throw}
          </button>
        ) : (
          <Dice values={dice} player={player} setAside={setAside} rollKey={rollKey} />
        )}
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
