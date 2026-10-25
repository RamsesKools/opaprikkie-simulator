import { timing } from "../game/timing.ts";
import felt from "../assets/felt.svg";
import wood from "../assets/wood.svg";

const textures = [felt, wood];

function stylesheet(link: HTMLLinkElement): Promise<unknown> {
  if (link.sheet) return Promise.resolve();
  return new Promise((done) => {
    link.addEventListener("load", done, { once: true });
    link.addEventListener("error", done, { once: true });
  });
}

function texture(src: string): Promise<unknown> {
  const image = new Image();
  image.src = src;
  return image.decode();
}

/** Resolves once the stylesheet, the textures, and any fonts are loaded; a failed or stalled one doesn't block past the cap. */
export async function assetsReady(): Promise<void> {
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]');
  const loaded = Promise.allSettled([
    ...Array.from(links, stylesheet),
    ...textures.map(texture),
    document.fonts?.ready,
  ]);
  let cap: ReturnType<typeof setTimeout> | undefined;
  const stalled = new Promise((done) => (cap = setTimeout(done, timing.assetsCap)));
  await Promise.race([loaded, stalled]);
  clearTimeout(cap);
}
