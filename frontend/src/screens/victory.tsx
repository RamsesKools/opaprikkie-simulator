import { useCallback, useState } from "react";
import { Board } from "../components/board.tsx";
import { Confetti } from "../components/confetti.tsx";
import { DiceChart } from "../components/dice_chart.tsx";
import type { Game } from "../game/model.ts";
import { useSeatStyle } from "../lib/seat_colours.ts";
import { strings } from "../lib/strings.ts";

type Props = { game: Game; onAgain: () => void };

export function Victory({ game, onAgain }: Props) {
  const seatStyle = useSeatStyle();
  const winner = game.winner!;
  const [celebrating, setCelebrating] = useState(true);
  const stopCelebrating = useCallback(() => setCelebrating(false), []);
  const max = Math.max(...game.dice_counts.flat());
  return (
    <div className="victory" style={seatStyle(winner)}>
      {celebrating && <Confetti seat={winner} onDone={stopCelebrating} />}
      <h2 className="winner">{strings.victory.wins(game.names[winner]!)}</h2>
      <button type="button" className="primary" onClick={onAgain} autoFocus>
        {strings.victory.again}
      </button>
      <section className="stats" aria-label={strings.victory.dice}>
        <p className="turns">{strings.victory.turns(game.turns)}</p>
        <h3>{strings.victory.dice}</h3>
        <div className="charts">
          {game.dice_counts.map((counts, seat) => (
            <DiceChart key={seat} seat={seat} name={game.names[seat]!} counts={counts} max={max} />
          ))}
        </div>
      </section>
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
