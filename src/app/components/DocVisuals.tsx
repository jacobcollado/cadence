import type { CSSProperties } from "react";
import { SERIES } from "../lib";
import { Icon, StatusIcon } from "./ui";

// Small, quiet pictures for the docs, each drawn from the real product: a
// pass's scroll speed, the report's tiles, frame strips, compare bars.

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

/** The report's three tiles, small, with example values. */
export function TilesSpecimen() {
  const tiles = [
    { level: "good" as const, label: "Smoothness", value: "60", unit: "fps", detail: "Smooth, out of 60" },
    { level: "warn" as const, label: "Page load", value: "3.1", unit: "s", detail: "Largest paint, 1 needs work" },
    { level: "good" as const, label: "Memory", value: "38.4", unit: "MB", detail: "Steady, at its peak" },
  ];
  return (
    <div className="specimen" aria-hidden="true">
      {tiles.map((t, i) => (
        <div key={t.label} className="specimen-tile" data-selected={i === 0 || undefined}>
          <span className="specimen-label"><StatusIcon level={t.level} size={12} />{t.label}</span>
          <span className="specimen-value num">{t.value}<span>{t.unit}</span></span>
          <span className="specimen-detail">{t.detail}</span>
        </div>
      ))}
    </div>
  );
}

/** A run of frames as bars: gray on time, a gap where one dropped, red for a freeze. */
export function FrameStrip({ kind }: { kind: "dropped" | "freeze" }) {
  const bars = Array.from({ length: 16 }, (_, i) => {
    if (kind === "dropped" && (i === 9 || i === 10)) return { h: 0, cls: "gap" };
    if (kind === "freeze" && i === 9) return { h: 100, cls: "freeze" };
    return { h: 26 + ((i * 7) % 5) * 3, cls: "" };
  });
  return (
    <span className="strip" aria-hidden="true">
      {bars.map((b, i) => <i key={i} className={b.cls} style={{ height: `${b.h}%` } as CSSProperties} />)}
    </span>
  );
}

/** What the browser was busy with, as the three causes a report can name. */
export function CauseTags() {
  return (
    <span className="causes" aria-hidden="true">
      <span><Icon name="code" size={12} />Script</span>
      <span><Icon name="layout" size={12} />Layout</span>
      <span><Icon name="drawing" size={12} />Drawing</span>
    </span>
  );
}

/** Three devices on one section, like the compare page. */
export function CompareSpecimen() {
  const rows = [
    { name: "iPhone", fps: 58 },
    { name: "Android", fps: 34 },
    { name: "Laptop", fps: 60 },
  ];
  return (
    <div className="cmp" aria-hidden="true">
      <div className="cmp-head"><span>Work</span><span className="num">fps</span></div>
      {rows.map((r, i) => (
        <div key={r.name} className="cmp-row">
          <span className="cmp-name"><i style={{ background: SERIES[i] }} />{r.name}</span>
          <span className="cmp-track"><span style={{ width: `${(r.fps / 60) * 100}%`, background: SERIES[i] }} /></span>
          <span className="cmp-value num">{r.fps}</span>
        </div>
      ))}
      <div className="cmp-note">Android was the slowest at 34 fps, against 60 on Laptop.</div>
    </div>
  );
}
