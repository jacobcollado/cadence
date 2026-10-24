// Motion tokens, shared by the probe overlay and the app. The CSS custom
// properties in both stylesheets carry the same values.

export const DUR = { fast: 140, base: 220, slow: 360, count: 720 } as const;

export const EASE = {
  out: "cubic-bezier(0.22, 1, 0.36, 1)",
  inOut: "cubic-bezier(0.65, 0, 0.35, 1)",
} as const;

export const MOTION_CSS = `
  --dur-fast: ${DUR.fast}ms;
  --dur-base: ${DUR.base}ms;
  --dur-slow: ${DUR.slow}ms;
  --ease-out: ${EASE.out};
  --ease-in-out: ${EASE.inOut};
`;

export function reducedMotion(): boolean {
  return matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Ease-out cubic, for values counted in JS. */
export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Changing text flips upward: the old line leaves through the top, the new one arrives from below. */
export function flipText(host: HTMLElement, text: string) {
  const current = host.lastElementChild as HTMLElement | null;
  if (current?.textContent === text) return;
  const next = document.createElement("span");
  next.textContent = text;
  host.appendChild(next);
  if (!current || reducedMotion()) {
    current?.remove();
    return;
  }
  const opts = { duration: DUR.base, easing: EASE.out };
  current.style.position = "absolute";
  current.style.left = "0";
  current.style.top = "0";
  current.animate(
    [{ transform: "translateY(0)", opacity: 1 }, { transform: "translateY(-100%)", opacity: 0 }],
    opts,
  ).onfinish = () => current.remove();
  next.animate(
    [{ transform: "translateY(100%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
    opts,
  );
}

/** Count a number up from zero (or from `from`) into an element. */
export function countUp(el: HTMLElement, to: number, format: (v: number) => string, from = 0) {
  if (reducedMotion()) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  const step = (now: number) => {
    const t = Math.min(1, (now - start) / DUR.count);
    el.textContent = format(from + (to - from) * easeOut(t));
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
