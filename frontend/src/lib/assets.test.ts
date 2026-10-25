import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { timing } from "../game/timing.ts";
import { assetsReady } from "./assets.ts";

const decoded: string[] = [];

function images(decode: (src: string) => Promise<void>) {
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode() {
        decoded.push(this.src);
        return decode(this.src);
      }
    },
  );
}

async function settled(promise: Promise<void>): Promise<boolean> {
  let done = false;
  void promise.then(() => (done = true));
  await new Promise((resolve) => setTimeout(resolve, 0));
  return done;
}

afterEach(() => {
  vi.unstubAllGlobals();
  document.head.innerHTML = "";
  decoded.length = 0;
  Reflect.deleteProperty(document, "fonts");
});

test("decodes the felt and the wood texture", async () => {
  images(async () => {});
  await assetsReady();

  expect(decoded).toHaveLength(2);
  expect(decoded.join()).toMatch(/felt.*wood/);
});

test("waits for the textures", async () => {
  let release!: () => void;
  const loading = new Promise<void>((resolve) => (release = resolve));
  images(() => loading);
  const ready = assetsReady();

  expect(await settled(ready)).toBe(false);
  release();
  await ready;
});

test("waits for a stylesheet that is still loading", async () => {
  images(async () => {});
  const link = document.createElement("link");
  link.rel = "stylesheet";
  document.head.append(link);
  const ready = assetsReady();

  expect(await settled(ready)).toBe(false);
  link.dispatchEvent(new Event("load"));
  await ready;
});

test("doesn't wait for a stylesheet that failed", async () => {
  images(async () => {});
  const link = document.createElement("link");
  link.rel = "stylesheet";
  document.head.append(link);
  const ready = assetsReady();

  link.dispatchEvent(new Event("error"));
  await expect(ready).resolves.toBeUndefined();
});

test("waits for fonts", async () => {
  images(async () => {});
  let release!: () => void;
  Object.defineProperty(document, "fonts", {
    configurable: true,
    value: { ready: new Promise<void>((resolve) => (release = resolve)) },
  });
  const ready = assetsReady();

  expect(await settled(ready)).toBe(false);
  release();
  await ready;
});

test("doesn't wait for a texture that failed to load", async () => {
  images(() => Promise.reject(new Error("broken")));
  await expect(assetsReady()).resolves.toBeUndefined();
});

test("doesn't wait for a stylesheet that is already loaded", async () => {
  images(async () => {});
  const link = document.createElement("link");
  link.rel = "stylesheet";
  Object.defineProperty(link, "sheet", { value: {} });
  document.head.append(link);

  await expect(assetsReady()).resolves.toBeUndefined();
});

describe("a stalled request", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  const stalled = new Promise<void>(() => {});

  async function finishesAt(ready: Promise<void>): Promise<boolean> {
    let done = false;
    void ready.then(() => (done = true));
    await vi.advanceTimersByTimeAsync(timing.assetsCap - 1);
    expect(done).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    return done;
  }

  test("stops holding the app back after the cap, for a texture", async () => {
    images(() => stalled);

    expect(await finishesAt(assetsReady())).toBe(true);
  });

  test("stops holding the app back after the cap, for a stylesheet", async () => {
    images(async () => {});
    const link = document.createElement("link");
    link.rel = "stylesheet";
    document.head.append(link);

    expect(await finishesAt(assetsReady())).toBe(true);
  });

  test("stops holding the app back after the cap, for fonts", async () => {
    images(async () => {});
    Object.defineProperty(document, "fonts", { configurable: true, value: { ready: stalled } });

    expect(await finishesAt(assetsReady())).toBe(true);
  });

  test("gives up on a stylesheet that failed before the check", async () => {
    images(async () => {});
    const link = document.createElement("link");
    link.rel = "stylesheet";
    document.head.append(link);
    link.dispatchEvent(new Event("error"));

    expect(await finishesAt(assetsReady())).toBe(true);
  });

  test("leaves no timer behind once everything loaded", async () => {
    images(async () => {});
    await assetsReady();

    expect(vi.getTimerCount()).toBe(0);
  });
});
