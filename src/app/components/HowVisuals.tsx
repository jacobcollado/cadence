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
 *  component dropping into its slot from the pointer. */
export function ProbePane() {
  const lines = [[96, 120], [116, 92], [136, 70], [196, 104], [216, 80]];
  return (
    <svg {...STAGE}>
      <rect className="art-a1 art-edge" x="44" y="30" width="420" height="300" rx="16" />
      <rect className="art-a2" x="64" y="46" width="64" height="12" rx="6" />
      {lines.map(([y, w], i) => <rect key={i} className="art-a2" x={i === 1 || i === 4 ? 92 : 72} y={y - 6} width={w} height="12" rx="6" />)}
      {/* The slot the probe lands in. */}
      <rect className="art-slot" x="92" y="148" width="150" height="34" rx="8" />
      <g className="art-drop">
        <rect className="art-ink" x="92" y="148" width="150" height="34" rx="8" />
        <text className="art-code" x="167" y="170" textAnchor="middle">{"<Cadence />"}</text>
        <Handle x={242} y={148} />
        <Pointer x={236} y={170} />
      </g>
      <path className="art-trail" d="M286 74 C270 96 262 120 250 140" />
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
      <rect className="art-a1 art-edge" x="246" y="-20" width="16" height="240" rx="8" />
      <rect className="art-a3 art-thumb" x="249" y="20" width="10" height="44" rx="5" />
      <rect className="art-frame" x="58" y="78" width="184" height="52" rx="10" />
      {[[58, 78], [242, 78], [58, 130], [242, 130]].map(([x, y]) => <Handle key={`${x}${y}`} x={x} y={y} className="art-handle art-handle-ink" />)}
      <rect className="art-ink" x="20" y="28" width="64" height="28" rx="6" />
      <text className="art-code" x="52" y="47" textAnchor="middle">?perf</text>
    </svg>
  );
}

/** The verdict: a dial hung from above, oversized and cropped, its violet
 *  needle swinging over from smooth into the inked ticks where frames run late. */
export function MiniFrames() {
  const C = { x: 150, y: -70 };
  const tick = (deg: number, r0: number, r1: number) => {
    const a = (deg * Math.PI) / 180;
    return { x1: C.x + Math.cos(a) * r0, y1: C.y + Math.sin(a) * r0, x2: C.x + Math.cos(a) * r1, y2: C.y + Math.sin(a) * r1 };
  };
  const ticks = Array.from({ length: 15 }, (_, i) => 24 + i * 9.5);
  return (
    <svg {...STAGE}>
      <circle className="art-a1 art-edge" cx={C.x} cy={C.y} r="232" />
      {ticks.map((d) => <line key={d} className={d < 72 ? "art-tick art-tick-late" : "art-tick"} {...tick(d, 196, 216)} />)}
      <g className="art-needle">
        <line className="art-stem" x1={C.x} y1={C.y} x2={C.x} y2={C.y + 178} />
        <circle className="art-pop" cx={C.x} cy={C.y + 186} r="12" />
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
