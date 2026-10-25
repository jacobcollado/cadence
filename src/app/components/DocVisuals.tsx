import type { CSSProperties } from "react";
import { SERIES } from "../lib";
import { Icon, ScoreRing } from "./ui";
import { GlassRow } from "./HowVisuals";
import { tint } from "../glass";

// Small diagrams for the docs, built from the same pieces as the product.

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

/** A run of frames in glass, the way the home page draws them: a missed frame is a gray pane, a freeze a run of them. */
export function FrameStrip({ kind }: { kind: "dropped" | "freeze" }) {
  const run = Array.from({ length: 16 }, (_, i) => (kind === "dropped" ? i !== 9 : i < 7 || i > 11) ? 1 : 0);
  return (
    <span className="strip" aria-hidden="true">
      <GlassRow run={run} />
    </span>
  );
}

/** What the browser was busy with, as the three causes a report can name. */
export function CauseTags() {
  return (
    <span className="causes" aria-hidden="true">
      <span className="glass" style={{ "--c": tint(0) } as CSSProperties}><Icon name="code" size={12} />Script</span>
      <span className="glass" style={{ "--c": tint(0.5) } as CSSProperties}><Icon name="layout" size={12} />Layout</span>
      <span className="glass" style={{ "--c": tint(1) } as CSSProperties}><Icon name="drawing" size={12} />Drawing</span>
    </span>
  );
}

/** Three devices across three sections, like the compare page, against the target line. */
export function CompareSpecimen() {
  const devices = [
    { name: "iPhone", fps: 59 },
    { name: "Android", fps: 42 },
    { name: "Laptop", fps: 60 },
  ];
  const sections = [
    { label: "Hero", fps: [60, 52, 60] },
    { label: "Work", fps: [58, 34, 60] },
    { label: "Close", fps: [59, 41, 60] },
  ];
  return (
    <figure className="cmp" aria-label="Example: three devices compared across three sections">
      <div className="cmp-legend">
        {devices.map((d, i) => (
          <span key={d.name} className="cmp-key">
            <i style={{ background: SERIES[i] }} />{d.name}<span className="num">{d.fps} fps</span>
          </span>
        ))}
        <span className="cmp-key cmp-key-target"><i />Target<span className="num">60 fps</span></span>
      </div>
      <div className="cmp-plot" aria-hidden="true">
        <span className="cmp-target" />
        {sections.map((s) => (
          <div key={s.label} className="cmp-group">
            <div className="cmp-bars">
              {s.fps.map((v, i) => (
                <span key={i} className="cmp-bar" style={{ height: `${(v / 60) * 100}%`, background: SERIES[i] }}>
                  <span className="num">{v}</span>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="cmp-labels" aria-hidden="true">
        {sections.map((s) => <span key={s.label}>{s.label}</span>)}
      </div>
      <figcaption className="cmp-note">Android was the slowest at 42 fps, against 60 on Laptop. The widest gap was in Work.</figcaption>
    </figure>
  );
}
