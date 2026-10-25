import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../../shared/motion";
import { tier } from "../../shared/stats";
import { DeviceIcon, type Device } from "./DeviceIcon";
import { CountUp } from "./ui";

// The hero's glass, standing in rows: half a second of the same scroll on
// three devices, one slab per frame. On time, the slabs stand evenly and run
// through the spectrum; a dropped frame leaves a gap, and a freeze stands as
// one wide red slab. The first time the rows come into view, each slab rises
// when its frame landed.

const SPAN = 500;           // ms shown
const BUDGET = 1000 / 60;   // one refresh at 60 Hz
const LEAD = 300;           // ms before the rows start
const SLAB = 0.62;          // share of a frame's width the slab fills
// Cool end of the hero's spectrum, so red is left for freezes.
const TINTS = ["#7c5ce6", "#3d6fe0", "#1fa2c9", "#2fb67c"];

type Row = { name: string; device: Device; frames: number[] };

/** A repeatable run of frame durations: mostly on time, some a refresh late, and freezes where given. */
function run(seed: number, late: number, freezes: number[]): number[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: number[] = [];
  let t = 0;
  for (;;) {
    const at = freezes.findIndex((f) => t >= f * SPAN);
    const d = at >= 0 ? 84 + rand() * 20 : rand() < late ? BUDGET * 2 : BUDGET;
    if (t + d > SPAN + 0.5) break;
    if (at >= 0) freezes = freezes.filter((_, i) => i !== at);
    t += d;
    out.push(d);
  }
  return out;
}

const ROWS: Row[] = [
  { name: "Laptop", device: "laptop", frames: run(7, 0, []) },
  { name: "iPhone", device: "apple", frames: run(11, 0.08, []) },
  { name: "Android", device: "android", frames: run(23, 0.16, [0.42]) },
];

/** A color a fraction of the way through the tints. */
function tint(f: number): string {
  const x = Math.min(f, 0.999) * (TINTS.length - 1);
  const i = Math.floor(x);
  return `color-mix(in oklab, ${TINTS[i]} ${Math.round((1 - (x - i)) * 100)}%, ${TINTS[i + 1]})`;
}

export function GlassFrames() {
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
    <figure ref={el} className="frames" data-play={play || undefined} aria-label="Half a second of the same scroll on a laptop, an iPhone and an Android phone, one glass slab per frame">
      {ROWS.map((row) => {
        let t = 0;
        return (
          <div key={row.name} className="frames-row">
            <div className="frames-name">
              <DeviceIcon device={row.device} />
              <span className="frames-fps num"><CountUp value={done ? Math.round(row.frames.length * 1000 / SPAN) : 0} /><span className="frames-unit">fps</span></span>
            </div>
            <div className="frames-track" aria-hidden="true">
              <span className="frames-shadow" />
              {row.frames.map((d, i) => {
                t += d;
                const freeze = tier(d, BUDGET) === 2;
                // A late frame's slab stands where it landed, leaving the missed slot empty.
                const slot = freeze ? d : BUDGET;
                const at = t - slot;
                return (
                  <span
                    key={i}
                    className="frames-slab"
                    data-freeze={freeze || undefined}
                    style={{
                      left: `${(at / SPAN) * 100}%`,
                      width: `${((slot - BUDGET * (1 - SLAB)) / SPAN) * 100}%`,
                      "--c": freeze ? "#e5484d" : tint(at / SPAN),
                      "--t": `${LEAD + t}ms`,
                    } as CSSProperties}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </figure>
  );
}
