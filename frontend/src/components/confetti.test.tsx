import { act, render } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { timing } from "../game/timing.ts";
import { Confetti } from "./confetti.tsx";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("drops pieces from the top, hidden from assistive tech and out of the way of clicks", () => {
  const { container } = render(<Confetti seat={1} />);

  expect(container.querySelector(".confetti")).toHaveAttribute("aria-hidden", "true");
  expect(container.querySelectorAll(".piece").length).toBeGreaterThan(40);
});

test("spreads the pieces instead of lining them up", () => {
  const { container } = render(<Confetti seat={0} />);

  const lefts = [...container.querySelectorAll<HTMLElement>(".piece")].map((piece) =>
    piece.style.getPropertyValue("--left"),
  );
  expect(new Set(lefts).size).toBeGreaterThan(40);
});

test("tells its owner when the burst is over", async () => {
  const onDone = vi.fn<() => void>();
  render(<Confetti seat={0} onDone={onDone} />);

  await act(() => vi.advanceTimersByTimeAsync(timing.confetti - 1));
  expect(onDone).not.toHaveBeenCalled();
  await act(() => vi.advanceTimersByTimeAsync(1));
  expect(onDone).toHaveBeenCalledOnce();
});

test("ends sooner with reduced motion", async () => {
  vi.stubGlobal("matchMedia", () => ({ matches: true }));
  const onDone = vi.fn<() => void>();
  render(<Confetti seat={0} onDone={onDone} />);

  await act(() => vi.advanceTimersByTimeAsync(timing.confettiReduced));

  expect(onDone).toHaveBeenCalledOnce();
});
