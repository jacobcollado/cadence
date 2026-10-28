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

/** The probe: the app's root layout, oversized and cropped, its tags as
 *  nested pills with guides down their indents. The pointer carries the
 *  component, marked with the logo in violet, down its dashed trail into the
 *  empty slot inside the body, and the slot's outline goes once it's filled. */
export function ProbePane() {
  const lines = [[52, 74, 70], [74, 100, 60], [98, 126, 96], [74, 204, 64], [52, 230, 72]];
  return (
    <svg {...STAGE}>
      {/* The file's tab, then the file over its lower edge. */}
      <rect className="art-a1 art-edge" x="34" y="16" width="124" height="40" rx="10" />
      <text className="art-file" x="96" y="40" textAnchor="middle">layout.tsx</text>
      <rect className="art-a1 art-edge" x="34" y="48" width="420" height="280" rx="16" />
      {lines.map(([x, y, w]) => <rect key={y} className="art-a2" x={x} y={y - 6} width={w} height="12" rx="6" />)}
      <line className="art-guide" x1="58" y1="88" x2="58" y2="216" />
      <line className="art-guide" x1="82" y1="114" x2="82" y2="190" />
      <rect className="art-slot" x="98" y="148" width="136" height="34" rx="8" />
      <path className="art-trail" d="M284 52 C292 96 268 142 236 168" />
      <g className="art-drop">
        <rect className="art-ink" x="98" y="148" width="136" height="34" rx="8" />
        <g transform="translate(103.2 155.2) scale(1.4)">
          <path className="art-mark" d="M13.2 7.27A5.25 5.25 0 1 1 7.82 2.75" />
          <circle className="art-pop" cx="11.38" cy="3.98" r="1.9" />
        </g>
        <text className="art-code" x="130" y="170">{"<Cadence />"}</text>
        <Handle x={234} y={148} />
        <Pointer x={228} y={170} />
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
        {/* On the frame's top edge, clear of both corner handles. */}
        <rect className="art-ink" x="120" y="116" width="112" height="28" rx="6" />
        <text className="art-code art-label art-tag" x="176" y="135" textAnchor="middle">Forced layout</text>
        <Pointer x={196} y={156} />
      </g>
    </svg>
  );
}
