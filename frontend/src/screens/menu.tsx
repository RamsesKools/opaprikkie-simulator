import { Slider } from "../components/slider.tsx";
import type { GameSetup, Mode } from "../game/model.ts";
import { nameProblem, seatNames, withSeat, type Draft } from "../lib/names.ts";
import { seatStyle } from "../lib/palette.ts";
import { strings } from "../lib/strings.ts";

const modes = [
  { value: "versus_ai", label: strings.menu.versusAi },
  { value: "hot_seat", label: strings.menu.hotSeat },
] as const satisfies { value: Mode; label: string }[];

type Props = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  /** The dev mode fields' options, or null outside dev mode. */
  dev: { strategies: string[] } | null;
  pending: boolean;
  onStart: (setup: GameSetup) => void;
};

export function Menu({ draft, onChange, dev, pending, onStart }: Props) {
  const { mode, roster, seed, strategy } = draft;
  const current = seatNames(roster, mode);
  const problem = nameProblem(current);
  const labels =
    mode === "hot_seat"
      ? [strings.menu.player(0), strings.menu.player(1)]
      : [strings.menu.you, strings.menu.opponent];

  const rename = (seat: number, name: string) =>
    onChange({ ...draft, roster: withSeat(roster, mode, seat, name) });

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
      <Slider
        label={strings.menu.mode}
        options={modes}
        value={mode}
        onChange={(chosen) => onChange({ ...draft, mode: chosen })}
      />
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
            <input
              value={seed}
              onChange={(event) => onChange({ ...draft, seed: event.target.value })}
            />
          </label>
          {mode === "versus_ai" && (
            <label>
              {strings.menu.strategy}
              <select
                value={strategy}
                onChange={(event) => onChange({ ...draft, strategy: event.target.value })}
              >
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
