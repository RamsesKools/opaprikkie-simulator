import { useRef, type KeyboardEvent } from "react";

const steps: Record<string, number> = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 };

type Props<T extends string> = {
  label: string;
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
};

/** A radio group drawn as a wooden slider; the arrow keys move and select, wrapping around. */
export function Slider<T extends string>({ label, options, value, onChange }: Props<T>) {
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const current = options.findIndex((option) => option.value === value);

  const select = (index: number) => {
    if (index !== current) onChange(options[index]!.value);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    let index: number;
    if (event.key === "Home") index = 0;
    else if (event.key === "End") index = options.length - 1;
    else if (event.key in steps)
      index = (current + steps[event.key]! + options.length) % options.length;
    else return;
    event.preventDefault();
    select(index);
    buttons.current[index]?.focus();
  };

  return (
    <div role="radiogroup" aria-label={label} className="slider wood" onKeyDown={onKeyDown}>
      {options.map((option, index) => (
        <button
          key={option.value}
          ref={(button) => {
            buttons.current[index] = button;
          }}
          type="button"
          role="radio"
          aria-checked={index === current}
          tabIndex={index === current ? 0 : -1}
          className={index === current ? "option on" : "option"}
          onClick={() => select(index)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
