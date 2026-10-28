import type { CSSProperties } from "react";

// The pictures for How it works, drawn as flat art: oversized gray shapes
// that run off the panel's edges, thick outlines, ringed handles, solid ink
// for the interface, and at most one pop of violet per picture. Each is drawn on a 300 × 200
// stage and fitted by height or width, whichever fits; shapes are drawn past
// the stage so a wider or taller panel never shows an edge.

const STAGE = { viewBox: "0 0 300 200", preserveAspectRatio: "xMidYMid meet", className: "art-stage", "aria-hidden": true } as const;

/** A ringed handle, like the corners of a selection. */
const Handle = ({ x, y, r = 6, className = "art-handle" }: { x: number; y: number; r?: number; className?: string }) => (
  <circle cx={x} cy={y} r={r} className={className} />
);

/** The pointer, tip at (x, y). */
const Pointer = ({ x, y, className }: { x: number; y: number; className?: string }) => (
  <path className={`art-a3 ${className ?? ""}`} transform={`translate(${x} ${y})`} d="M0 0 L26 9 Q28 10 26 12 L15 16 L10 27 Q9 29 7 27 Z" strokeLinejoin="round" />
);

/** The probe: the app's layout file, oversized and cropped, with the
 *  pointer carrying the component down its dashed trail into the slot. The
 *  trail starts where the pointer picks it up, so it never comes from nowhere. */
export function ProbePane() {
  const lines = [[96, 120], [116, 92], [136, 70], [196, 104], [216, 80]];
  return (
    <svg {...STAGE}>
      <rect className="art-a1 art-edge" x="44" y="30" width="420" height="300" rx="16" />
      <rect className="art-a2" x="64" y="46" width="64" height="12" rx="6" />
      {lines.map(([y, w], i) => <rect key={i} className="art-a2" x={i === 1 || i === 4 ? 92 : 72} y={y - 6} width={w} height="12" rx="6" />)}
      {/* The slot the probe lands in. */}
      <rect className="art-slot" x="92" y="148" width="150" height="34" rx="8" />
      {/* The trail runs from where the pointer starts to where it lands. */}
      <path className="art-trail" d="M292 52 C300 96 276 142 244 168" />
      <g className="art-drop">
        <rect className="art-ink" x="92" y="148" width="150" height="34" rx="8" />
        <text className="art-code" x="167" y="170" textAnchor="middle">{"<Cadence />"}</text>
        <Handle x={242} y={148} />
        <Pointer x={236} y={170} />
      </g>
    </svg>
  );
}

/** A pass: a page scrolls under the panel's window, held like a selection
 *  with ringed corners. Inside the window the page darkens, because that's
 *  what gets measured. */
export function ScrollPanes() {
  const blocks = [[54, 120], [40, 92], [28, 120], [64, 100], [32, 120], [44, 84]];
  let y = 0;
  const column = blocks.map(([h, w]) => { const b = { y, h, w }; y += h + 12; return b; });
  const loop = y; // one full run of the blocks
  const draw = (cls: string) => (
    <g className="art-scroll" style={{ "--loop": `${-loop}px` } as CSSProperties}>
      {[0, loop].flatMap((off) => column.map((b, i) => <rect key={`${off}-${i}`} className={cls} x={90} y={b.y + off - 20} width={b.w} height={b.h} rx="8" />))}
    </g>
  );
  return (
    <svg {...STAGE}>
      <defs>
        <clipPath id="art-page"><rect x="74" y="-60" width="152" height="320" rx="16" /></clipPath>
        <clipPath id="art-window"><rect x="58" y="78" width="184" height="52" rx="10" /></clipPath>
      </defs>
      <rect className="art-a1 art-edge" x="74" y="-60" width="152" height="320" rx="16" />
      <g clipPath="url(#art-page)">{draw("art-a2")}</g>
      <g clipPath="url(#art-window)">{draw("art-a3")}</g>
      {/* The scrollbar, chunky, its thumb running with the page. */}
      <rect className="art-a1 art-edge" x="268" y="-20" width="16" height="240" rx="8" />
      <rect className="art-a3 art-thumb" x="271" y="20" width="10" height="44" rx="5" />
      <rect className="art-frame" x="58" y="78" width="184" height="52" rx="10" />
      {[[58, 78], [242, 78], [58, 130], [242, 130]].map(([x, y]) => <Handle key={`${x}${y}`} x={x} y={y} className="art-handle art-handle-ink" />)}
      <rect className="art-ink" x="20" y="28" width="64" height="28" rx="6" />
      <text className="art-code" x="52" y="47" textAnchor="middle">?perf</text>
    </svg>
  );
}

/** The verdict: the report, oversized and cropped, one row per section with
 *  a bar for how smoothly it scrolled. The one that stuttered is short and
 *  red, held in a selection frame with its cause tagged on the edge, and the
 *  pointer on it. */
export function MiniFrames() {
  const rows = [{ y: 74, w: 156 }, { y: 104, w: 138 }, { y: 150, w: 58, bad: true }, { y: 196, w: 150 }];
  return (
    <svg {...STAGE}>
      <rect className="art-a1 art-edge" x="22" y="22" width="420" height="280" rx="16" />
      <rect className="art-a2" x="42" y="40" width="64" height="12" rx="6" />
      {rows.map((r, i) => (
        <g key={r.y}>
          <rect className="art-a2" x="44" y={r.y - 6} width="36" height="12" rx="6" />
          <rect className={r.bad ? "art-bad art-grow" : "art-a3 art-grow"} style={{ "--i": i } as CSSProperties} x="92" y={r.y - 8} width={r.w} height="16" rx="8" />
        </g>
      ))}
      <g className="art-flag">
        <rect className="art-frame" x="32" y="130" width="236" height="40" rx="10" />
        {[[32, 130], [268, 130], [32, 170], [268, 170]].map(([x, y]) => <Handle key={`${x}${y}`} x={x} y={y} className="art-handle art-handle-ink" />)}
        <rect className="art-ink" x="152" y="116" width="112" height="28" rx="6" />
        <text className="art-code art-label art-tag" x="208" y="135" textAnchor="middle">Forced layout</text>
        <Pointer x={176} y={156} />
      </g>
    </svg>
  );
}

/** A short run of frames as flat bars: gray where drawn, an empty
 *  outlined slot where missed. Quiet rows (nothing recorded yet) are all empty slots. */
export function GlassRow({ run, quiet, className = "how-frames" }: { run: number[]; quiet?: boolean; className?: string }) {
  return (
    <span className={className} aria-hidden="true">
      {run.map((drawn, i) => <span key={i} className="art how-frame" data-miss={(!drawn && !quiet) || undefined} data-empty={quiet || undefined} />)}
    </span>
  );
}
