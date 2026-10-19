import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { GameSetup } from "../game/model.ts";
import { strings } from "../lib/strings.ts";
import { Menu } from "./menu.tsx";

type Shown = { initial?: GameSetup | null; pending?: boolean };

function show({ initial = null, pending = false }: Shown = {}) {
  const onStart = vi.fn<(setup: GameSetup) => void>();
  render(<Menu initial={initial} pending={pending} onStart={onStart} />);
  return { onStart };
}

const switchMode = (from: string) =>
  fireEvent.click(screen.getByRole("button", { name: strings.menu.mode(from) }));

test("starts a game versus the AI by default", () => {
  const { onStart } = show();

  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "versus_ai", names: ["Player 1", "Opa"] });
});

test("switches to a hot-seat game with the default names", () => {
  const { onStart } = show();

  switchMode(strings.menu.versusAi);
  expect(
    screen.getByRole("button", { name: strings.menu.mode(strings.menu.hotSeat) }),
  ).toBeVisible();
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
  switchMode(strings.menu.versusAi);
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

test("keeps the previous setup", () => {
  show({ initial: { mode: "hot_seat", names: ["Ann", "Oma"] } });

  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Oma");
  switchMode(strings.menu.hotSeat);
  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Opa");
});
