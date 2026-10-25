import type { CSSProperties } from "react";

// The hero's visual: a stack of tinted glass slabs pinned near their base,
// slowly fanning open and closing again like a deck of swatches. Where slabs
// overlap, the tints deepen. Transforms only, so it stays smooth on phones.

const SLABS = ["#7c5ce6", "#3d6fe0", "#1fa2c9", "#2fb67c", "#f5b82e", "#f2762e", "#e5484d"];
const SPREAD = 14;  // degrees between slabs when open
// Shut, it still shows a sliver of each, so the colors never stack into mud.

export function GlassFan() {
  const mid = (SLABS.length - 1) / 2;
  return (
    <div className="glass-fan" aria-hidden="true">
      <span className="glass-shadow" />
      {SLABS.map((c, i) => (
        <span
          key={c}
          className="glass-slab"
          style={{
            "--c": c,
            "--i": i,
            "--open": `${(i - mid) * SPREAD}deg`,
            "--shut": `${(i - mid) * 5}deg`,
          } as CSSProperties}
        />
      ))}
    </div>
  );
}
