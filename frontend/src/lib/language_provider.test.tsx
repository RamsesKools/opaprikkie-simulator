import { fireEvent, render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { STORAGE_KEY, useLanguage } from "./language.ts";
import { LanguageProvider } from "./language_provider.tsx";

function Probe() {
  const { language, strings, setLanguage } = useLanguage();
  return (
    <>
      <p>{`${language}:${strings.rules}`}</p>
      <button type="button" onClick={() => setLanguage("en")}>
        english
      </button>
    </>
  );
}

const shown = () =>
  render(
    <LanguageProvider>
      <Probe />
    </LanguageProvider>,
  );

test("starts in Dutch when nothing is stored", () => {
  localStorage.clear();
  shown();

  expect(screen.getByText("nl:Regels")).toBeInTheDocument();
  expect(document.documentElement.lang).toBe("nl");
});

test("starts from the stored language and stores a switch", () => {
  localStorage.setItem(STORAGE_KEY, "en");
  shown();
  expect(screen.getByText("en:Rules")).toBeInTheDocument();

  localStorage.setItem(STORAGE_KEY, "nl");
  fireEvent.click(screen.getByRole("button", { name: "english" }));

  expect(localStorage.getItem(STORAGE_KEY)).toBe("en");
  expect(document.documentElement.lang).toBe("en");
});

test("ignores a stored value that isn't a language", () => {
  localStorage.setItem(STORAGE_KEY, "klingon");
  shown();

  expect(screen.getByText("nl:Regels")).toBeInTheDocument();
});

test("still works when storage throws", () => {
  const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
    throw new Error("blocked");
  });
  shown();
  expect(screen.getByText("nl:Regels")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "english" }));

  expect(screen.getByText("en:Rules")).toBeInTheDocument();
  get.mockRestore();
  set.mockRestore();
});

test("needs a provider", () => {
  const quiet = vi.spyOn(console, "error").mockImplementation(() => {});

  expect(() => render(<Probe />)).toThrow("LanguageProvider");
  quiet.mockRestore();
});
