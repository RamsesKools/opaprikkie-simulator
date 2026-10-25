/// <reference types="node" />
import { readFileSync } from "node:fs";
import { expect, test } from "vitest";

const read = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const html = read("../../index.html");
const css = read("../styles.css");
const assets = read("./assets.ts");

const token = (name: string) => new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`, "i").exec(css)?.[1];
const splash = html.slice(html.indexOf("<style>"), html.indexOf("</style>"));
const colours = (rule: string, property: string) =>
  [
    ...(new RegExp(`${rule}\\s*{[^}]*}`).exec(splash)?.[0] ?? "").matchAll(
      new RegExp(`${property}:[^;]*?(#[0-9a-f]{6})`, "gi"),
    ),
  ].map((match) => match[1]);

test("preloads exactly the textures the app imports", () => {
  const imported = [...assets.matchAll(/import \w+ from "\.\.\/(assets\/[^"]+)"/g)].map(
    (match) => `/src/${match[1]}`,
  );
  const preloaded = [...html.matchAll(/<link rel="preload"[^>]*href="([^"]+)"/g)].map(
    (match) => match[1],
  );

  expect(imported).toHaveLength(2);
  expect(preloaded).toEqual(imported);
});

test("paints the splash with the paper, ink and wood tokens", () => {
  const paper = token("paper");
  const ink = token("ink");
  const woodDark = token("wood-dark");

  expect(paper).toBeDefined();
  expect(colours("body", "background")).toEqual([paper]);
  expect(colours("#splash", "background")).toEqual([paper]);
  expect(colours("#splash", "color")).toEqual([ink]);
  expect(colours("#splash .die", "border")).toEqual([ink]);
  expect(colours("#splash .die", "box-shadow")).toEqual([woodDark]);
  expect(colours("#splash .die i", "background")).toEqual([ink]);
});
