import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../../shared/motion";
import { tier } from "../../shared/stats";
import { CountUp } from "./ui";

// Strobe arcs: one dot travels the same half circle on three devices, and
// every frame it was drawn leaves an imprint, like a strobe photograph. On
// time, the imprints sit evenly; where frames dropped there's a gap, and the
// imprint after it is amber, or red after a freeze. The first time the arcs
// come into view they draw in at real speed.

const SPAN = 1000;          // ms the dot takes to cross
const BUDGET = 1000 / 60;   // one refresh at 60 Hz
const LEAD = 300;           // ms before the arcs start drawing
const W = 560, CX = 280, CY = 244;

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
  { name: "Laptop", device: "laptop", r: 104, frames: run(7, 0, []) },
  { name: "iPhone", device: "apple", r: 160, frames: run(11, 0.06, []) },
  { name: "Android", device: "android", r: 216, frames: run(23, 0.1, [0.3, 0.68]) },
];

/** Where on its arc the dot is after a fraction of the crossing: left end to right end, over the top. */
function point(r: number, f: number): [number, number] {
  const a = Math.PI * (1 - Math.min(f, 1));
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)];
}

export function StrobeArcs() {
  const el = useRef<HTMLElement>(null);
  const [play, setPlay] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (reducedMotion()) { setPlay(true); setDone(true); return; }
    let timer = 0;
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      setPlay(true);
      timer = window.setTimeout(() => setDone(true), LEAD + SPAN);
    }, { rootMargin: "0px 0px -20% 0px" });
    io.observe(el.current!);
    return () => { io.disconnect(); clearTimeout(timer); };
  }, []);

  return (
    <figure ref={el} className="strobe" data-play={play || undefined} aria-label="One second of the same motion on a laptop, an iPhone and an Android phone, one imprint per frame">
      <div className="strobe-stage">
      <svg className="strobe-plot" viewBox={`0 0 ${W} ${CY + 8}`} aria-hidden="true">
        {ARCS.map((arc) => {
          let t = 0;
          return (
            <g key={arc.name}>
              <path className="strobe-guide" d={`M${CX - arc.r} ${CY}A${arc.r} ${arc.r} 0 0 1 ${CX + arc.r} ${CY}`} />
              {arc.frames.map((d, i) => {
                t += d;
                const [x, y] = point(arc.r, t / SPAN);
                const level = tier(d, BUDGET);
                return (
                  <circle
                    key={i}
                    className="strobe-dot"
                    data-tier={level || undefined}
                    cx={x}
                    cy={y}
                    r={level ? 3.5 : 2.5}
                    style={{ "--t": `${LEAD + Math.min(t, SPAN)}ms` } as CSSProperties}
                  />
                );
              })}
            </g>
          );
        })}
      </svg>
      {ARCS.map((arc) => (
        <span key={arc.name} className="strobe-end" style={{ left: `${((CX - arc.r) / W) * 100}%` }}>
          <DeviceIcon device={arc.device} />
        </span>
      ))}
      {ARCS.map((arc, i) => (
        <span key={arc.name} className="strobe-end strobe-fps num" style={{ left: `${((CX + arc.r) / W) * 100}%` }}>
          <CountUp value={done ? Math.round(arc.frames.length * 1000 / SPAN) : 0} />{i === ARCS.length - 1 && <span className="strobe-unit">fps</span>}
        </span>
      ))}
      </div>
    </figure>
  );
}
