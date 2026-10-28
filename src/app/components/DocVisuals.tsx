import type { CSSProperties } from "react";
import { Icon, ScoreRing } from "./ui";

// Small diagrams for the docs, drawn in the home page's flat art: gray
// tones with an outline, ink for the interface, red for a freeze.

export type Pass = "steady" | "fast" | "idle" | "manual";

/** A page with a viewport window moving down it at the pass's speed. */
export function PassMeter({ pass }: { pass: Pass }) {
  return (
    <span className="pass" data-pass={pass} aria-hidden="true">
      <span className="pass-page">
        {[0, 1, 2, 3, 4].map((i) => <i key={i} />)}
      </span>
      <span className="pass-window" />
    </span>
  );
}

/** The report's three tiles, small, with example values and scores, each with its meaning beneath. */
export function TilesSpecimen() {
  const tiles = [
    { score: 98, label: "Smoothness", value: "60", unit: "fps", about: "Smooth, Uneven or Choppy, for the page and each of its sections." },
    { score: 72, label: "Page load", value: "3.1", unit: "s", about: "How fast the page appeared, on the thresholds Google uses for Core Web Vitals." },
    { score: 94, label: "Memory", value: "1,240", unit: "elements", about: "Whether the page kept piling up elements or memory during the run." },
  ];
  return (
    <div className="specimen-wrap">
      <div className="specimen" aria-hidden="true">
        {tiles.map((t, i) => (
          <div key={t.label} className="specimen-tile" data-selected={i === 0 || undefined}>
            <span className="specimen-label"><ScoreRing score={t.score} size={24} />{t.label}</span>
            <span className="specimen-value num">{t.value}<span>{t.unit}</span></span>
          </div>
        ))}
      </div>
      <dl className="specimen-about">
        {tiles.map((t) => <div key={t.label}><dt>{t.label}</dt><dd>{t.about}</dd></div>)}
      </dl>
    </div>
  );
}

const BUDGET = 1000 / 60;
const CAP = 64; // ms at the panel's full height

/** A short run of frames in the home page's flat art, standing under a
 *  dashed line at the 16.7 ms budget. A dropped frame is an empty outlined
 *  slot where a frame should have been; a freeze is one red bar that shoots
 *  far past the line. */
export function FrameStrip({ kind }: { kind: "dropped" | "freeze" }) {
  const times = [16, 15, 17, 16, 16, 15, 17, 16, 16, kind === "freeze" ? 58 : 0, 16, 17, 15, 16, 16, 17];
  return (
    <span className="strip" aria-hidden="true">
      <span className="strip-bars">
        {times.map((ms, i) => (
          <span key={i} className="art strip-bar" data-miss={ms === 0 || undefined} data-late={ms > BUDGET + 1 || undefined}
            style={{ "--h": `${((ms || 16) / CAP) * 100}%` } as CSSProperties} />
        ))}
      </span>
      <span className="strip-budget" style={{ bottom: `calc(14px + (100% - 30px) * ${(BUDGET / CAP).toFixed(4)})` }} />
    </span>
  );
}

/** What the browser was busy with, as the three causes a report can name. */
export function CauseTags() {
  return (
    <span className="causes" aria-hidden="true">
      <span className="cause"><Icon name="code" size={12} />Script</span>
      <span className="cause"><Icon name="layout" size={12} />Layout</span>
      <span className="cause"><Icon name="drawing" size={12} />Drawing</span>
    </span>
  );
}
