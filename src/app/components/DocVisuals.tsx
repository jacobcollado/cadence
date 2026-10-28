import type { CSSProperties } from "react";
import { Icon, ScoreRing } from "./ui";

// Small diagrams for the docs, drawn in the home page's flat art: gray
// tones with an outline, ink for the interface, red for a freeze.

export type Pass = "steady" | "fast" | "idle" | "manual";

const BLOCKS = [[26, 100], [12, 72], [34, 100], [12, 84], [20, 64], [28, 100]];

/** A pass, drawn as a scene: the page as a tall sheet of gray blocks running
 *  past the screen, an ink frame with ringed corners held still in the middle.
 *  Steady and Fast scroll the page at their speeds; Idle holds it still while
 *  one violet dot keeps pulsing, the work that never stops; Manual drags it
 *  back and forth under the pointer. */
export function PassScene({ pass }: { pass: Pass }) {
  const blocks = [...BLOCKS, ...BLOCKS];
  return (
    <span className="pass-scene" data-pass={pass} aria-hidden="true">
      <span className="pass-sheet">
        <span className="pass-track">
          {blocks.map(([h, w], i) => <i key={i} style={{ height: h, width: `${w}%` }} />)}
        </span>
      </span>
      <span className="pass-frame">
        {["tl", "tr", "bl", "br"].map((c) => <span key={c} className="vs-handle" data-at={c} />)}
        {pass === "idle" && <span className="pass-pulse" />}
      </span>
      {pass === "manual" && (
        <svg className="pass-pointer" viewBox="0 0 30 30"><path d="M2 2 L28 11 Q30 12 28 14 L17 18 L12 29 Q11 31 9 29 Z" /></svg>
      )}
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
      <span className="strip-budget" style={{ bottom: `calc(14px + (100% - 34px) * ${(BUDGET / CAP).toFixed(4)})` }} />
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
