import type { CSSProperties } from "react";
import { Slider } from "../components/slider.tsx";
import type { GameSetup, Mode } from "../game/model.ts";
import { resolveColours, seatColours, withColour } from "../lib/colours.ts";
import { useStrings } from "../lib/language.ts";
import { namesValid, seatNames, withSeat, type Draft } from "../lib/names.ts";
import { palette, type ColourId } from "../lib/palette.ts";
import { useSeatStyle } from "../lib/seat_colours.ts";

type Props = {
  draft: Draft;
  onChange: (draft: Draft) => void;
  /** The dev mode fields' options, or null outside dev mode. */
  dev: { strategies: string[] } | null;
  pending: boolean;
  onStart: (setup: GameSetup) => void;
};

export function Menu({ draft, onChange, dev, pending, onStart }: Props) {
  const strings = useStrings();
  const seatStyle = useSeatStyle();
  const { mode, roster, colours, seed, strategy } = draft;
  const current = seatNames(roster, mode);
  const chosen = seatColours(colours, mode);
  const valid = namesValid(current);
  const modes = [
    { value: "versus_ai", label: strings.menu.versusAi },
    { value: "hot_seat", label: strings.menu.hotSeat },
  ] as const satisfies { value: Mode; label: string }[];
  const labels =
    mode === "hot_seat"
      ? [strings.menu.player(0), strings.menu.player(1)]
      : [strings.menu.you, strings.menu.opponent];

  const recolour = (seat: number, colour: ColourId) =>
    onChange({ ...draft, colours: withColour(colours, mode, seat, colour) });
  const rename = (seat: number, name: string) =>
    onChange({ ...draft, roster: withSeat(roster, mode, seat, name) });

  return (
    <form
      className="menu"
      onSubmit={(event) => {
        event.preventDefault();
        if (valid && !pending) {
          const setup: GameSetup = { mode, names: [current[0].trim(), current[1].trim()] };
          if (dev && seed.trim()) setup.seed = seed.trim();
          if (dev && strategy && mode === "versus_ai") setup.strategy = strategy;
          onStart(setup);
        }
      }}
    >
      <Slider
        label={strings.menu.mode}
        options={modes}
        value={mode}
        onChange={(next) =>
          onChange({ ...draft, mode: next, colours: resolveColours(colours, next) })
        }
      />
      {current.map((name, seat) => (
        <div key={`${mode}:${seat}`} className="name" style={seatStyle(seat)}>
          <label>
            {labels[seat]}
            <input value={name} onChange={(event) => rename(seat, event.target.value)} />
          </label>
          <div
            role="radiogroup"
            aria-label={strings.menu.colourOf(labels[seat]!)}
            className="colours"
          >
            {palette.map(({ id, main }) => {
              const taken = chosen[1 - seat] === id;
              const colour = strings.menu.colours[id];
              return (
                <label
                  key={id}
                  className="colour"
                  style={{ "--swatch": main } as CSSProperties}
                  title={taken ? strings.menu.colourTaken(colour) : colour}
                >
                  <input
                    type="radio"
                    name={`colour-${seat}`}
                    aria-label={colour}
                    checked={chosen[seat] === id}
                    disabled={taken}
                    onChange={() => recolour(seat, id)}
                  />
                  <span />
                </label>
              );
            })}
          </div>
        </div>
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
      {!valid && (
        <p className="problem" role="alert">
          {strings.menu.nameLength}
        </p>
      )}
      <button type="submit" className="primary" disabled={!valid || pending}>
        {strings.menu.start}
      </button>
    </form>
  );
}
