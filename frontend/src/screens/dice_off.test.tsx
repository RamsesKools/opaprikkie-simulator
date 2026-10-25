import { act, fireEvent, screen, within } from "@testing-library/react";
import { render } from "../test_utils.tsx";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import type { GameUpdate, Phase } from "../game/model.ts";
import { timing } from "../game/timing.ts";
import { en as strings } from "../lib/strings_en.ts";
import { DiceOff } from "./dice_off.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

type Choose = (player: number) => Promise<boolean>;

function update(phase: Phase, seat: number): GameUpdate {
  return {
    game: {
      ruleset: "classic",
      phase,
      names: ["Ann", "Opa"],
      controllers: ["human", "ai"],
      pegs: [{}, {}],
      turns: 0,
      dice_counts: [
        [0, 0, 0, 0, 0, 0],
        [0, 0, 0, 0, 0, 0],
      ],
      observation: {
        ruleset: "classic",
        seat,
        pegs: [{}, {}],
        opening_roll: [],
        legal_targets: [],
        turn: 1,
        continuation: 0,
        sequence: null,
        takes: [],
      },
      winner: null,
      seed: null,
      strategy: null,
    },
    logs: [
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

const throwStack = () => screen.queryByRole("button", { name: strings.game.throwStack(2) });

const message = () => document.querySelector<HTMLElement>(".message")!;

test("throws from two-dice stacks, letting the AI throw by itself and auto-pressing the human's", async () => {
  vi.spyOn(Math, "random").mockReturnValue(0.5);
  render(
    <DiceOff
      update={update("choosing_first_player", 0)}
      onChooseFirst={vi.fn<Choose>()}
      onAiStarts={vi.fn<(update: GameUpdate) => void>()}
    />,
  );

  expect(throwStack()).toBeInTheDocument();
  expect(screen.getByRole("img", { name: strings.game.stack(2) })).toBeInTheDocument();

  await advance(timing.aiThrow);
  expect(screen.getByRole("img", { name: strings.game.dice([6, 6]) })).toBeInTheDocument();
  expect(screen.queryByRole("img", { name: strings.game.stack(2) })).not.toBeInTheDocument();
  expect(throwStack()).toBeInTheDocument();

  await advance(4000 - timing.aiThrow);
  expect(screen.getByRole("img", { name: strings.game.dice([2, 3]) })).toBeInTheDocument();
  expect(throwStack()).not.toBeInTheDocument();
});

test("asks a human winner who starts, right under their highlighted name", async () => {
  const onChooseFirst = vi.fn<Choose>(() => Promise.resolve(true));
  render(
    <DiceOff
      update={update("choosing_first_player", 0)}
      onChooseFirst={onChooseFirst}
      onAiStarts={vi.fn<(update: GameUpdate) => void>()}
    />,
  );

  fireEvent.click(throwStack()!);
  await advance(timing.aiThrow);
  expect(message()).toHaveTextContent(strings.diceOff.wins("Ann"));
  const winner = within(message()).getByText("Ann");
  expect(winner).toHaveClass("winner-name");
  expect(winner.style.getPropertyValue("--seat")).toBe("#d63a2f");
  const choices = message().nextElementSibling as HTMLElement;
  expect(within(choices).getByText(strings.diceOff.whoStarts)).toBeInTheDocument();
  expect(within(choices).getAllByRole("button")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.starts("Opa") }));
  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.starts("Ann") }));

  expect(onChooseFirst).toHaveBeenCalledExactlyOnceWith(1);
});

test("offers the choice again after it fails", async () => {
  const onChooseFirst = vi.fn<Choose>(() => Promise.resolve(false));
  render(
    <DiceOff
      update={update("choosing_first_player", 0)}
      onChooseFirst={onChooseFirst}
      onAiStarts={vi.fn<(update: GameUpdate) => void>()}
    />,
  );
  fireEvent.click(throwStack()!);
  await advance(timing.aiThrow);

  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.starts("Opa") }));
  await advance(0);
  fireEvent.click(screen.getByRole("button", { name: strings.diceOff.starts("Ann") }));

  expect(onChooseFirst.mock.calls).toEqual([[1], [0]]);
});

test("hands over once an AI winner has started", async () => {
  const onAiStarts = vi.fn<(update: GameUpdate) => void>();
  const started = update("choosing_target", 0);
  render(<DiceOff update={started} onChooseFirst={vi.fn<Choose>()} onAiStarts={onAiStarts} />);

  fireEvent.click(throwStack()!);
  await advance(timing.aiThrow);
  expect(message()).toHaveTextContent(strings.diceOff.aiStarts("Opa"));
  expect(within(message()).getByText("Opa").style.getPropertyValue("--seat")).toBe("#2f6bd6");
  expect(onAiStarts).not.toHaveBeenCalled();

  await advance(timing.diceOffResult);
  expect(onAiStarts).toHaveBeenCalledExactlyOnceWith(started);
});

test("shows fresh boards, though an AI winner has already played on", () => {
  const played = update("choosing_target", 0);
  played.game.pegs = [
    { 1: 0, 2: 0 },
    { 1: 0, 2: 3 },
  ];
  render(
    <DiceOff
      update={played}
      onChooseFirst={vi.fn<Choose>()}
      onAiStarts={vi.fn<(update: GameUpdate) => void>()}
    />,
  );

  const rows = [...document.querySelectorAll<HTMLElement>(".board .peg")].map((peg) =>
    peg.style.getPropertyValue("--row"),
  );
  expect(rows).toEqual(["0", "0", "0", "0"]);
});
