// The glass palette: the cool end of the hero's spectrum, used for every
// glass pane and for the report's colors, so the site reads as one family.

export const TINTS = ["#7c5ce6", "#3d6fe0", "#1fa2c9", "#2fb67c"];

/** Each report category's tint, a step apart along the spectrum. */
export const CATEGORY = { smooth: 0, load: 1 / 3, memory: 2 / 3 } as const;

/** A color a fraction of the way through the tints, as CSS. */
export function tint(f: number): string {
  const x = Math.min(Math.max(f, 0), 0.999) * (TINTS.length - 1);
  const i = Math.floor(x);
  return `color-mix(in oklab, ${TINTS[i]} ${Math.round((1 - (x - i)) * 100)}%, ${TINTS[i + 1]})`;
}

const rgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** The same color as rgba, for canvas, which can't read color-mix. */
export function tintRgba(f: number, alpha = 1): string {
  const x = Math.min(Math.max(f, 0), 0.999) * (TINTS.length - 1);
  const i = Math.floor(x);
  const a = rgb(TINTS[i]), b = rgb(TINTS[i + 1]), t = x - i;
  const [r, g, bl] = a.map((v, k) => Math.round(v + (b[k] - v) * t));
  return `rgba(${r}, ${g}, ${bl}, ${alpha})`;
}
