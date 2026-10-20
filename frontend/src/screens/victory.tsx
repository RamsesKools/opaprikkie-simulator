import { Board } from "../components/board.tsx";
import type { Game } from "../game/model.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type Props = { game: Game; onAgain: () => void };

export function Victory({ game, onAgain }: Props) {
  const winner = game.winner!;
  return (
    <div className="victory" style={seatStyle(winner)}>
      <h2 className="winner">{strings.victory.wins(game.names[winner]!)}</h2>
      <button type="button" className="primary" onClick={onAgain} autoFocus>
        {strings.victory.again}
      </button>
      <div className="boards">
        {game.pegs.map((board, seat) => (
          <Board
            key={seat}
            player={seat}
            name={game.names[seat]!}
            pegs={board}
            active={seat === winner}
          />
        ))}
      </div>
    </div>
  );
}
