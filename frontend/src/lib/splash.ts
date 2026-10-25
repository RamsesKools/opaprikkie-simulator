const FADE_MS = 250;

/** The splash lives in `index.html`, outside React, so it paints before the bundle. */
export function hideSplash(): void {
  const splash = document.getElementById("splash");
  if (!splash) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    splash.remove();
    return;
  }
  splash.classList.add("done");
  setTimeout(() => splash.remove(), FADE_MS);
}
