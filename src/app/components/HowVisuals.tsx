import type { CSSProperties } from "react";
import { tint } from "../glass";

// The pictures for How it works, in the same glass as the hero and the
// frame rows: the probe added to a page, the page scrolling under the
// panel's window, and a report's row of frames with its misses in gray.

/** The probe: the app's layout file as a gray pane, and the tinted pane
 *  that drops into it when the probe is added. */
export function ProbePane() {
  return (
    <span className="how-probe" aria-hidden="true">
      <span className="glass how-probe-back" data-off><span className="how-probe-file">app/layout.tsx</span></span>
      <span className="glass how-probe-front" style={{ "--c": tint(0) } as CSSProperties}>{"<Cadence />"}</span>
    </span>
  );
}

const STRIPS = 6;
const WIDTHS = [100, 72, 88, 64, 96, 80];

/** A pass: the page's sections scroll past the panel's window. Outside the
 *  window they're gray; inside it they light up, because that's what gets measured. */
export function ScrollPanes() {
  // The strips are drawn twice so the loop never shows a seam.
  const strips = Array.from({ length: STRIPS * 2 }, (_, i) => i % STRIPS);
  const track = (lit: boolean) => (
    <span className="how-scroll-track">
      {strips.map((k, i) => (
        <span key={i} className="glass how-strip" data-off={!lit || undefined} style={{ "--c": lit ? tint(0.3 + (k / STRIPS) * 0.4) : undefined, width: `${WIDTHS[k]}%` } as CSSProperties} />
      ))}
    </span>
  );
  return (
    <span className="how-scroll" aria-hidden="true">
      {track(false)}
      <span className="how-scroll-lit">{track(true)}</span>
      {/* The panel's window: a clear lens the sections pass under. */}
      <span className="how-window" />
    </span>
  );
}

/** A short run of frames in glass: tinted where drawn, gray where missed. */
export function GlassRow({ run, from = 0, to = 1, className = "how-frames" }: { run: number[]; from?: number; to?: number; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {run.map((drawn, i) => (
        <span key={i} className="glass how-frame" data-off={!drawn || undefined} style={{ "--c": drawn ? tint(from + (i / run.length) * (to - from)) : undefined } as CSSProperties} />
      ))}
    </span>
  );
}

// How long each frame of a short run took, in ms.
const TIMES = [15, 16, 14, 16, 15, 34, 50, 16, 15, 16, 33, 16, 14, 16];
const BUDGET = 16.7;
const SCALE = 42;

/** A report's verdict in miniature: each frame as a pane as tall as it took,
 *  under a dashed line at the 16.7 ms budget. The ones that broke it are gray. */
export function MiniFrames() {
  return (
    <span className="how-budget" aria-hidden="true">
      <span className="how-budget-bars">
        {TIMES.map((ms, i) => {
          const over = ms > BUDGET;
          return (
            <span key={i} className="glass how-bar" data-off={over || undefined}
              style={{ "--c": over ? undefined : tint(0.5 + (i / TIMES.length) * 0.5), "--h": `${Math.min(ms / SCALE, 1) * 100}%`, "--i": i } as CSSProperties} />
          );
        })}
      </span>
      <span className="how-budget-line" style={{ bottom: `${(BUDGET / SCALE) * 100}%` }}><span>16.7 ms</span></span>
    </span>
  );
}
