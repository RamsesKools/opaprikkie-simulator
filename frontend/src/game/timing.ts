export const timing = {
  ready: 700,
  roll: 900,
  move: 800,
  popup: 2400,
  popupReduced: 600,
  confetti: 2400,
  confettiReduced: 200,
  continuation: 1800,
  aiThink: 900,
  aiThrow: 1200,
  autoThrowMin: 3000,
  autoThrowMax: 5000,
  diceOffResult: 1800,
};

const reducedMotion = () =>
  typeof window.matchMedia === "function" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** How long a pop-up stays before it goes by itself; reduced motion shortens it. */
export const popupMs = () => (reducedMotion() ? timing.popupReduced : timing.popup);

/** How long a confetti burst stays in the page. */
export const confettiMs = () => (reducedMotion() ? timing.confettiReduced : timing.confetti);
