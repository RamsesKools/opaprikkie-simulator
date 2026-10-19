import { useState } from "react";
import type { GameSetup, Mode } from "../game/model.ts";
import { nameProblem } from "../lib/names.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

type Names = [string, string];

const defaults: Record<Mode, Names> = {
  hot_seat: [strings.menu.player(0), strings.menu.player(1)],
  versus_ai: [strings.menu.player(0), strings.menu.defaultAiName],
};

type Props = { initial: GameSetup | null; pending: boolean; onStart: (setup: GameSetup) => void };

export function Menu({ initial, pending, onStart }: Props) {
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "hot_seat");
  const [names, setNames] = useState<Record<Mode, Names>>(() =>
    initial ? { ...defaults, [initial.mode]: initial.names } : defaults,
  );
  const current = names[mode];
  const problem = nameProblem(current);
  const labels =
    mode === "hot_seat"
      ? [strings.menu.player(0), strings.menu.player(1)]
      : [strings.menu.you, strings.menu.opponent];

  const rename = (seat: number, value: string) => {
    const next: Names = [...current];
    next[seat] = value;
    setNames({ ...names, [mode]: next });
  };

  return (
    <form
      className="menu"
      onSubmit={(event) => {
        event.preventDefault();
        if (problem === null && !pending) {
          onStart({ mode, names: [current[0].trim(), current[1].trim()] });
        }
      }}
    >
      <fieldset className="modes">
        <legend>{strings.menu.mode}</legend>
        {(["hot_seat", "versus_ai"] as const).map((option) => (
          <label key={option}>
            <input
              type="radio"
              name="mode"
              checked={mode === option}
              onChange={() => setMode(option)}
            />
            {option === "hot_seat" ? strings.menu.hotSeat : strings.menu.versusAi}
          </label>
        ))}
      </fieldset>
      {current.map((name, seat) => (
        <label key={`${mode}:${seat}`} className="name" style={seatStyle(seat)}>
          <span className="swatch" />
          {labels[seat]}
          <input value={name} onChange={(event) => rename(seat, event.target.value)} />
        </label>
      ))}
      {problem && (
        <p className="problem" role="alert">
          {problem}
        </p>
      )}
      <button type="submit" className="primary" disabled={problem !== null || pending}>
        {strings.menu.start}
      </button>
    </form>
  );
}
