import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../../shared/motion";
import { tier } from "../../shared/stats";
import { CountUp } from "./ui";

// Strobe arcs: a bright head travels the same half circle on three devices,
// and every frame it was drawn leaves a tick, like a strobe photograph. On
// time, the ticks sit evenly; a dropped frame leaves a gap, and a freeze a
// wide one closed by a red tick. The first time the arcs come into view, the
// heads run at real speed, stepping once per frame, so the slow device
// visibly stalls.

const SPAN = 1000;          // ms the dot takes to cross
const BUDGET = 1000 / 60;   // one refresh at 60 Hz
const LEAD = 300;           // ms before the arcs start drawing
const FADE = 240;           // ms the heads take to fade at the end
const W = 584, CX = 280, CY = 260;   // room on the right for the last label
const TICK = 7;            // half a tick's length
const LABEL = 44;          // room under the baseline for the labels

type Device = "laptop" | "apple" | "android";
type Arc = { name: string; device: Device; r: number; frames: number[] };

/** The device at the end of each arc: the Apple and Android marks, and a plain laptop drawn to the same weight. */
function DeviceIcon({ device }: { device: Device }) {
  if (device === "apple") return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" />
    </svg>
  );
  if (device === "android") return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M2 19a10 10 0 0 1 20 0zM7 15a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0zM14.8 15a1.1 1.1 0 1 0 2.2 0a1.1 1.1 0 1 0-2.2 0z" />
      <path d="M6.6 10.2L4.4 6.4M17.4 10.2l2.2-3.8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 24 24" fill="currentColor">
      <path fillRule="evenodd" d="M5.5 4h13A1.5 1.5 0 0 1 20 5.5V16H4V5.5A1.5 1.5 0 0 1 5.5 4zM6 6v8h12V6z" />
      <rect x="1.5" y="17.5" width="21" height="2.5" rx="1.25" />
    </svg>
  );
}

/** A repeatable run of frame durations: mostly on time, some a refresh late, and freezes where given. */
function run(seed: number, late: number, freezes: number[]): number[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: number[] = [];
  let t = 0;
  // Stop on the last frame that lands within the crossing (a hair of
  // rounding allowed), so 60 frames read as 60 fps.
  for (;;) {
    const at = freezes.findIndex((f) => t >= f * SPAN);
    const d = at >= 0 ? 100 + rand() * 30 : rand() < late ? BUDGET * 2 : BUDGET;
    if (t + d > SPAN + 0.5) break;
    if (at >= 0) freezes = freezes.filter((_, i) => i !== at);
    t += d;
    out.push(d);
  }
  return out;
}

const ARCS: Arc[] = [
  { name: "Laptop", device: "laptop", r: 124, frames: run(7, 0, []) },
  { name: "iPhone", device: "apple", r: 186, frames: run(11, 0.06, []) },
  { name: "Android", device: "android", r: 248, frames: run(23, 0.1, [0.3, 0.68]) },
];

/** A point at radius r, a fraction of the way along the half circle: left end to right end, over the top. */
function polar(r: number, f: number): [number, number] {
  const a = Math.PI * (1 - Math.min(f, 1));
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

/** Frame end times along a run, so each tick and head step lands when its frame did. */
function ends(frames: number[]): number[] {
  let t = 0;
  return frames.map((d) => (t += d));
}

export function StrobeArcs() {
  const el = useRef<HTMLElement>(null);
  const heads = useRef<(SVGGElement | null)[]>([]);
  const [play, setPlay] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reducedMotion()) { setPlay(true); setDone(true); return; }
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setPlay(true);
      // Each head turns about the center, holding still between frames and
      // stepping when one lands: a slow frame is a visible stall.
      ARCS.forEach((arc, i) => {
        const keys: Keyframe[] = [{ transform: "rotate(0deg)", opacity: 1, offset: 0 }];
        let last = 0;
        for (const t of ends(arc.frames)) {
          const o = Math.min(t, SPAN) / (SPAN + FADE);
          keys.push({ transform: `rotate(${last}deg)`, opacity: 1, offset: o });
          last = (180 * Math.min(t, SPAN)) / SPAN;
          keys.push({ transform: `rotate(${last}deg)`, opacity: 1, offset: o });
        }
        keys.push({ transform: `rotate(${last}deg)`, opacity: 0, offset: 1 });
        heads.current[i]?.animate(keys, { duration: SPAN + FADE, delay: LEAD, fill: "both" });
      });
      timer = window.setTimeout(() => setDone(true), LEAD + SPAN);
    }, { rootMargin: "0px 0px -20% 0px" });
    io.observe(el.current!);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);

  return (
    <figure ref={el} className="strobe" data-play={play || undefined} aria-label="One second of the same motion on a laptop, an iPhone and an Android phone, one imprint per frame">
      <svg className="strobe-plot" viewBox={`0 0 ${W} ${CY + LABEL}`} aria-hidden="true">
        {ARCS.map((arc, i) => {
          const times = ends(arc.frames);
          return (
            <g key={arc.name}>
              <path className="strobe-guide" d={`M${CX - arc.r} ${CY}A${arc.r} ${arc.r} 0 0 1 ${CX + arc.r} ${CY}`} />
              {arc.frames.map((d, j) => {
                const f = times[j] / SPAN;
                const freeze = tier(d, BUDGET) === 2;
                const len = freeze ? TICK + 3 : TICK;
                const [x1, y1] = polar(arc.r - len, f);
                const [x2, y2] = polar(arc.r + len, f);
                return (
                  <line
                    key={j}
                    className="strobe-tick"
                    data-freeze={freeze || undefined}
                    x1={x1} y1={y1} x2={x2} y2={y2}
                    style={{ "--t": `${LEAD + Math.min(times[j], SPAN)}ms` } as CSSProperties}
                  />
                );
              })}
              <g ref={(g) => { heads.current[i] = g; }} className="strobe-head" style={{ transformOrigin: `${CX}px ${CY}px` }}>
                <circle className="strobe-glow" cx={CX - arc.r} cy={CY} r={9} />
                <circle className="strobe-dot" cx={CX - arc.r} cy={CY} r={4} />
              </g>
            </g>
          );
        })}
      </svg>
      {ARCS.map((arc, i) => (
        <span key={arc.name} className="strobe-label" style={{ left: `${((CX + arc.r) / W) * 100}%`, top: `${(CY / (CY + LABEL)) * 100}%` }}>
          <DeviceIcon device={arc.device} />
          <span className="strobe-fps num">
            <CountUp value={done ? Math.round(arc.frames.length * 1000 / SPAN) : 0} />{i === ARCS.length - 1 && <span className="strobe-unit">fps</span>}
          </span>
        </span>
      ))}
    </figure>
  );
}
