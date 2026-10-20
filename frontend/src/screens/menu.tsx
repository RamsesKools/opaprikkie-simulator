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

const modeLabels: Record<Mode, string> = {
  versus_ai: strings.menu.versusAi,
  hot_seat: strings.menu.hotSeat,
};

type Props = {
  initial: GameSetup | null;
  /** The dev mode fields' options, or null outside dev mode. */
  dev: { strategies: string[] } | null;
  pending: boolean;
  onStart: (setup: GameSetup) => void;
};

export function Menu({ initial, dev, pending, onStart }: Props) {
  const [mode, setMode] = useState<Mode>(initial?.mode ?? "versus_ai");
  const [names, setNames] = useState<Record<Mode, Names>>(() =>
    initial ? { ...defaults, [initial.mode]: initial.names } : defaults,
  );
  const [seed, setSeed] = useState(initial?.seed ?? "");
  const [strategy, setStrategy] = useState(initial?.strategy ?? "");
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
          const chosen: GameSetup = { mode, names: [current[0].trim(), current[1].trim()] };
          if (dev && seed.trim()) chosen.seed = seed.trim();
          if (dev && strategy && mode === "versus_ai") chosen.strategy = strategy;
          onStart(chosen);
        }
      }}
    >
      <button
        type="button"
        className="mode-switch wood"
        aria-label={strings.menu.mode(modeLabels[mode])}
        onClick={() => setMode(mode === "versus_ai" ? "hot_seat" : "versus_ai")}
      >
        {(["versus_ai", "hot_seat"] as const).map((option) => (
          <span key={option} className={option === mode ? "option on" : "option"}>
            {modeLabels[option]}
          </span>
        ))}
      </button>
      {current.map((name, seat) => (
        <label key={`${mode}:${seat}`} className="name" style={seatStyle(seat)}>
          <span className="swatch" />
          {labels[seat]}
          <input value={name} onChange={(event) => rename(seat, event.target.value)} />
        </label>
      ))}
      {dev && (
        <fieldset className="dev">
          <legend>{strings.menu.dev}</legend>
          <label>
            {strings.menu.seed}
            <input value={seed} onChange={(event) => setSeed(event.target.value)} />
          </label>
          {mode === "versus_ai" && (
            <label>
              {strings.menu.strategy}
              <select value={strategy} onChange={(event) => setStrategy(event.target.value)}>
                <option value="">{strings.menu.randomStrategy}</option>
                {dev.strategies.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </fieldset>
      )}
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
