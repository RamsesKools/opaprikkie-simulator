import { fireEvent, screen, within } from "@testing-library/react";
import { render } from "../test_utils.tsx";
import { useState } from "react";
import { expect, test, vi } from "vitest";
import type { GameSetup } from "../game/model.ts";
import { en as strings } from "../lib/strings_en.ts";
import { newDraft, type Draft } from "../lib/names.ts";
import { Menu } from "./menu.tsx";

type Dev = { strategies: string[] } | null;
type Shown = { initial?: Partial<Draft>; dev?: Dev; pending?: boolean };

function show({ initial = {}, dev = null, pending = false }: Shown = {}) {
  const onStart = vi.fn<(setup: GameSetup) => void>();
  function Controlled() {
    const [draft, setDraft] = useState<Draft>({ ...newDraft(strings), ...initial });
    return <Menu draft={draft} onChange={setDraft} dev={dev} pending={pending} onStart={onStart} />;
  }
  render(<Controlled />);
  return { onStart };
}

const switchTo = (label: string) => fireEvent.click(screen.getByRole("radio", { name: label }));

test("starts a game versus the AI by default", () => {
  const { onStart } = show();

  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "versus_ai", names: ["Player 1", "Opa"] });
});

test("switches to a hot-seat game with the default names", () => {
  const { onStart } = show();

  switchTo(strings.menu.hotSeat);
  expect(screen.getByRole("radiogroup", { name: strings.menu.mode })).toBeVisible();
  expect(screen.getByRole("radio", { name: strings.menu.hotSeat })).toBeChecked();
  expect(screen.getByRole("radio", { name: strings.menu.versusAi })).not.toBeChecked();
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "hot_seat", names: ["Player 1", "Player 2"] });
});

test("defaults the AI's name to Opa and trims names", () => {
  const { onStart } = show();

  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Opa");
  fireEvent.change(screen.getByLabelText(strings.menu.you), { target: { value: "  Ann  " } });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "versus_ai", names: ["Ann", "Opa"] });
});

test("blocks blank names but allows duplicates", () => {
  const { onStart } = show();
  switchTo(strings.menu.hotSeat);
  const start = screen.getByRole("button", { name: strings.menu.start });

  fireEvent.change(screen.getByLabelText(strings.menu.player(0)), { target: { value: " " } });
  expect(screen.getByRole("alert")).toHaveTextContent(strings.menu.nameLength);
  expect(start).toBeDisabled();

  fireEvent.change(screen.getByLabelText(strings.menu.player(0)), {
    target: { value: "player 2" },
  });
  expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  fireEvent.click(start);
  expect(onStart).toHaveBeenCalledWith({ mode: "hot_seat", names: ["player 2", "Player 2"] });
});

test("blocks a second start while one is pending", () => {
  const { onStart } = show({ pending: true });
  const start = screen.getByRole("button", { name: strings.menu.start });

  expect(start).toBeDisabled();
  fireEvent.submit(start);
  expect(onStart).not.toHaveBeenCalled();
});

test("shows the draft's mode and names", () => {
  show({ initial: { mode: "hot_seat", roster: { players: ["Ann", "Bob"], ai: "Oma" } } });

  expect(screen.getByLabelText(strings.menu.player(0))).toHaveValue("Ann");
  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Bob");
});

test("keeps player 1 across modes, and player 2 and the AI apart", () => {
  const { onStart } = show();
  const start = () => fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  fireEvent.change(screen.getByLabelText(strings.menu.you), { target: { value: "Ann" } });
  fireEvent.change(screen.getByLabelText(strings.menu.opponent), { target: { value: "Oma" } });
  switchTo(strings.menu.hotSeat);
  expect(screen.getByLabelText(strings.menu.player(0))).toHaveValue("Ann");
  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Player 2");
  fireEvent.change(screen.getByLabelText(strings.menu.player(1)), { target: { value: "Bob" } });
  start();
  switchTo(strings.menu.versusAi);
  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Oma");
  start();

  expect(onStart.mock.calls).toEqual([
    [{ mode: "hot_seat", names: ["Ann", "Bob"] }],
    [{ mode: "versus_ai", names: ["Ann", "Oma"] }],
  ]);
});

test("hides the dev mode fields outside dev mode", () => {
  show();

  expect(screen.queryByLabelText(strings.menu.seed)).not.toBeInTheDocument();
  expect(screen.queryByLabelText(strings.menu.strategy)).not.toBeInTheDocument();
});

test("sends the seed and the AI strategy in dev mode", () => {
  const { onStart } = show({ dev: { strategies: ["greedy", "smart"] } });

  fireEvent.change(screen.getByLabelText(strings.menu.seed), { target: { value: " 42 " } });
  fireEvent.change(screen.getByLabelText(strings.menu.strategy), { target: { value: "smart" } });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({
    mode: "versus_ai",
    names: ["Player 1", "Opa"],
    seed: "42",
    strategy: "smart",
  });
});

test("leaves a blank seed and a random strategy out", () => {
  const { onStart } = show({ dev: { strategies: ["greedy"] } });

  expect(screen.getByLabelText(strings.menu.strategy)).toHaveDisplayValue(
    strings.menu.randomStrategy,
  );
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "versus_ai", names: ["Player 1", "Opa"] });
});

test("offers the AI strategy versus the AI only", () => {
  const { onStart } = show({ dev: { strategies: ["greedy"] } });

  fireEvent.change(screen.getByLabelText(strings.menu.strategy), { target: { value: "greedy" } });
  switchTo(strings.menu.hotSeat);
  expect(screen.queryByLabelText(strings.menu.strategy)).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "hot_seat", names: ["Player 1", "Player 2"] });
});

test("keeps the previous seed and strategy in dev mode", () => {
  show({
    initial: { seed: "7", strategy: "greedy" },
    dev: { strategies: ["greedy", "smart"] },
  });

  expect(screen.getByLabelText(strings.menu.seed)).toHaveValue("7");
  expect(screen.getByLabelText(strings.menu.strategy)).toHaveValue("greedy");
});

const swatches = (group: string) =>
  within(screen.getByRole("radiogroup", { name: strings.menu.colourOf(group) }));
const swatch = (group: string, colour: keyof typeof strings.menu.colours) =>
  swatches(group).getByRole("radio", { name: strings.menu.colours[colour] });

test("offers every colour as a radio per player, the AI too", () => {
  show();

  for (const group of [strings.menu.you, strings.menu.opponent]) {
    expect(swatches(group).getAllByRole("radio")).toHaveLength(8);
  }
  expect(swatch(strings.menu.you, "red")).toBeChecked();
  expect(swatch(strings.menu.opponent, "blue")).toBeChecked();
});

test("disables the colour of the other seat", () => {
  show();

  expect(swatch(strings.menu.you, "blue")).toBeDisabled();
  expect(swatch(strings.menu.opponent, "red")).toBeDisabled();
  expect(swatch(strings.menu.you, "pink")).toBeEnabled();
});

test("picks a colour per seat", () => {
  show({ initial: { mode: "hot_seat" } });

  fireEvent.click(swatch(strings.menu.player(0), "pink"));
  fireEvent.click(swatch(strings.menu.player(1), "red"));

  expect(swatch(strings.menu.player(0), "pink")).toBeChecked();
  expect(swatch(strings.menu.player(1), "red")).toBeChecked();
  expect(swatch(strings.menu.player(0), "red")).toBeDisabled();
});

test("keeps the AI's colour apart from player 2's", () => {
  show();

  fireEvent.click(swatch(strings.menu.opponent, "purple"));
  switchTo(strings.menu.hotSeat);

  expect(swatch(strings.menu.player(1), "blue")).toBeChecked();
  switchTo(strings.menu.versusAi);
  expect(swatch(strings.menu.opponent, "purple")).toBeChecked();
});

test("moves the second seat on when a mode switch would make the colours clash", () => {
  show();
  fireEvent.click(swatch(strings.menu.opponent, "purple"));
  fireEvent.click(swatch(strings.menu.you, "blue"));

  switchTo(strings.menu.hotSeat);

  expect(swatch(strings.menu.player(0), "blue")).toBeChecked();
  expect(swatch(strings.menu.player(1), "red")).toBeChecked();
  expect(swatch(strings.menu.player(1), "blue")).toBeDisabled();
});
