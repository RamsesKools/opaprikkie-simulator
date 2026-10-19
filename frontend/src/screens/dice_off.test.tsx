import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { GameView, Update } from "../game/model.ts";
import { timing } from "../game/timing.ts";
import { strings } from "../lib/strings.ts";
import { DiceOff } from "./dice_off.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

function update(state: Partial<GameView>): Update {
  return {
    state: {
      phase: "choosing_first_player",
      names: ["Ann", "Opa"],
      controllers: ["human", "ai"],
      pegs: [{}, {}],
      current_player: 0,
      opening_roll: [],
      legal_targets: [],
      turn: 0,
      continuation: 0,
      winner: null,
      ...state,
    },
    log: [
      {
        kind: "dice_off",
        rolls: [
          { player: 0, dice: [2, 3] },
          { player: 1, dice: [6, 6] },
        ],
      },
    ],
  };
}

test("lets the AI throw by itself and auto-presses the human's Throw button", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  render(
    <DiceOff
      update={update({})}
      onChooseFirst={vi.fn<(player: number) => void>()}
      onAiStarts={vi.fn<(update: Update) => void>()}
    />,
  );

  await advance(timing.aiThrow);
  expect(screen.getByRole("img", { name: strings.game.dice([6, 6]) })).toBeInTheDocument();
  expect(screen.getByRole("button", { name: strings.diceOff.throw })).toBeInTheDocument();

  await advance(4000 - timing.aiThrow);
  expect(screen.getByRole("img", { name: strings.game.dice([2, 3]) })).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: strings.diceOff.throw })).not.toBeInTheDocument();
});

test("asks a human winner who starts", async () => {
  const onChooseFirst = vi.fn<(player: number) => void>();
  render(
    <DiceOff
      update={update({})}
      onChooseFirst={onChooseFirst}
      onAiStarts={vi.fn<(update: Update) => void>()}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.throw }));
  await advance(timing.aiThrow);
  expect(screen.getByText(strings.diceOff.wins("Ann"))).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.starts("Opa") }));
  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.starts("Ann") }));

  expect(onChooseFirst).toHaveBeenCalledExactlyOnceWith(1);
});

test("hands over once an AI winner has started", async () => {
  const onAiStarts = vi.fn<(update: Update) => void>();
  const started = update({ phase: "choosing_target", current_player: 0, turn: 2 });
  render(
    <DiceOff
      update={started}
      onChooseFirst={vi.fn<(player: number) => void>()}
      onAiStarts={onAiStarts}
    />,
  );

  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.throw }));
  await advance(timing.aiThrow);
  expect(screen.getByText(strings.diceOff.aiStarts("Opa"))).toBeInTheDocument();
  expect(onAiStarts).not.toHaveBeenCalled();

  await advance(timing.diceOffResult);
  expect(onAiStarts).toHaveBeenCalledExactlyOnceWith(started);
});
