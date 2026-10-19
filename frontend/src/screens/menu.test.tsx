import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import type { GameSetup } from "../game/model.ts";
import { strings } from "../lib/strings.ts";
import { Menu } from "./menu.tsx";

test("starts a hot-seat game with the default names", () => {
  const onStart = vi.fn<(setup: GameSetup) => void>();
  render(<Menu initial={null} onStart={onStart} />);

  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "hot_seat", names: ["Player 1", "Player 2"] });
});

test("defaults the AI's name to Opa and trims names", () => {
  const onStart = vi.fn<(setup: GameSetup) => void>();
  render(<Menu initial={null} onStart={onStart} />);

  fireEvent.click(screen.getByLabelText(strings.menu.versusAi));
  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Opa");
  fireEvent.change(screen.getByLabelText(strings.menu.you), { target: { value: "  Ann  " } });
  fireEvent.click(screen.getByRole("button", { name: strings.menu.start }));

  expect(onStart).toHaveBeenCalledWith({ mode: "versus_ai", names: ["Ann", "Opa"] });
});

test("blocks blank and duplicate names", () => {
  const onStart = vi.fn<(setup: GameSetup) => void>();
  render(<Menu initial={null} onStart={onStart} />);
  const start = screen.getByRole("button", { name: strings.menu.start });

  fireEvent.change(screen.getByLabelText(strings.menu.player(0)), { target: { value: " " } });
  expect(screen.getByRole("alert")).toHaveTextContent(strings.menu.nameLength);
  expect(start).toBeDisabled();

  fireEvent.change(screen.getByLabelText(strings.menu.player(0)), {
    target: { value: "player 2" },
  });
  expect(screen.getByRole("alert")).toHaveTextContent(strings.menu.nameDuplicate);
  fireEvent.submit(start);
  expect(onStart).not.toHaveBeenCalled();
});

test("keeps the previous setup", () => {
  render(
    <Menu
      initial={{ mode: "versus_ai", names: ["Ann", "Oma"] }}
      onStart={vi.fn<(setup: GameSetup) => void>()}
    />,
  );

  expect(screen.getByLabelText(strings.menu.opponent)).toHaveValue("Oma");
  fireEvent.click(screen.getByLabelText(strings.menu.hotSeat));
  expect(screen.getByLabelText(strings.menu.player(1))).toHaveValue("Player 2");
});
