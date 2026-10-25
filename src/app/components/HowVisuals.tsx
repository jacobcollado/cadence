import type { CSSProperties } from "react";
import { tint } from "./GlassFrames";

// The pictures for How it works, in the same glass as the hero and the
// frame rows: the probe added to a page, the page scrolling under the
// panel's window, and a report's row of frames with its misses in gray.

/** The probe: one tinted pane laid over the gray panes of an existing page. */
export function ProbePane() {
  return (
    <span className="how-probe" aria-hidden="true">
      <span className="glass how-probe-back" data-off />
      <span className="glass how-probe-back" data-off />
      <span className="glass how-probe-front" style={{ "--c": tint(0) } as CSSProperties}>{"<Cadence />"}</span>
    </span>
  );
}

const STRIPS = 6;

/** A pass: the page's sections, as glass strips, scrolling past a fixed window. */
export function ScrollPanes() {
  // The strips are drawn twice so the loop never shows a seam.
  const strips = Array.from({ length: STRIPS * 2 }, (_, i) => i % STRIPS);
  return (
    <span className="how-scroll" aria-hidden="true">
      <span className="how-scroll-track">
        {strips.map((k, i) => (
          <span key={i} className="glass how-strip" style={{ "--c": tint(0.3 + (k / STRIPS) * 0.4), width: `${[100, 72, 88, 64, 96, 80][k]}%` } as CSSProperties} />
        ))}
      </span>
      {/* The panel's window, drawn as a dashed marquee whose dashes march, like a selection being worked on. */}
      <svg className="how-window" aria-hidden="true">
        <rect x="1" y="1" width="calc(100% - 2px)" height="calc(100% - 2px)" rx="6" />
      </svg>
    </span>
  );
}

// Which refreshes a short run drew (1) and missed (0).
const RUN = [1, 1, 1, 1, 1, 0, 0, 1, 1, 1, 0, 1, 1, 1];

/** A report's verdict in miniature: frames in glass, the misses in gray. */
export function MiniFrames() {
  return (
    <span className="how-frames" aria-hidden="true">
      {RUN.map((drawn, i) => (
        <span key={i} className="glass how-frame" data-off={!drawn || undefined} style={{ "--c": drawn ? tint(0.5 + (i / RUN.length) * 0.5) : undefined } as CSSProperties} />
      ))}
    </span>
  );
}
