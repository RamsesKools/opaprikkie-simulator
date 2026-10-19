import { Board } from "../components/board.tsx";
import type { GameView } from "../game/model.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type Props = { view: GameView; onAgain: () => void };

export function Victory({ view, onAgain }: Props) {
  const winner = view.winner!;
  return (
    <div className="victory" style={seatStyle(winner)}>
      <h2 className="winner">{strings.victory.wins(view.names[winner]!)}</h2>
      <button type="button" className="primary" onClick={onAgain} autoFocus>
        {strings.victory.again}
      </button>
      <div className="boards">
        {view.pegs.map((board, seat) => (
          <Board
            key={seat}
            player={seat}
            name={view.names[seat]!}
            pegs={board}
            active={seat === winner}
          />
        ))}
      </div>
    </div>
  );
}
