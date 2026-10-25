import { render as renderBase, type RenderOptions } from "@testing-library/react";
import type { ReactElement } from "react";
import { LanguageProvider } from "./lib/language_provider.tsx";

/** Renders inside the language provider, which starts from the stored language. */
export const render = (ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) =>
  renderBase(ui, { wrapper: LanguageProvider, ...options });
