import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { App } from "./app.tsx";

test("shows the backend version from the health check", async () => {
  const fetch = vi.fn<typeof globalThis.fetch>(() =>
    Promise.resolve(Response.json({ version: "1.2.3", dev_mode: false })),
  );
  vi.stubGlobal("fetch", fetch);

  render(<App />);

  expect(await screen.findByText("Backend: v1.2.3")).toBeInTheDocument();
  expect(fetch).toHaveBeenCalledWith("/api/health");
});

test("says the backend is unavailable when the health check fails", async () => {
  vi.stubGlobal("fetch", () => Promise.resolve(new Response(null, { status: 502 })));

  render(<App />);

  expect(await screen.findByText("Backend: unavailable")).toBeInTheDocument();
});
