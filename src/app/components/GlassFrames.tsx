import { useEffect, useRef, useState, type CSSProperties } from "react";
import { reducedMotion } from "../../shared/motion";
import { DeviceIcon, type Device } from "./DeviceIcon";
import { CountUp } from "./ui";
import { tint } from "../glass";

// The hero's glass, standing in rows: half a second of the same scroll on
// three devices, one pane per screen refresh. A refresh that got a new frame
// is a tinted pane, running through the spectrum; one the page missed is a
// gray pane, so every chop shows exactly where it happened. The first time
// the rows come into view, each pane rises when its refresh passed.

const SPAN = 500;           // ms shown
const BUDGET = 1000 / 60;   // one refresh at 60 Hz
const SLOTS = Math.round(SPAN / BUDGET);
const LEAD = 300;           // ms before the rows start

type Row = { name: string; device: Device; drawn: boolean[] };


/**
 * A repeatable run as refresh slots: true where a frame was drawn, false
 * where the page missed one. Some frames run a refresh late; a freeze
 * misses several in a row.
 */
function run(seed: number, late: number, freezes: { at: number; slots: number }[]): boolean[] {
  let s = seed;
  const rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const out: boolean[] = [];
  while (out.length < SLOTS) {
    const freeze = freezes.find((f) => f.at === out.length);
    const missed = freeze ? freeze.slots : out.length > 0 && rand() < late ? 1 : 0;
    for (let i = 0; i < missed && out.length < SLOTS - 1; i++) out.push(false);
    out.push(true);
  }
  return out.slice(0, SLOTS);
}

const ROWS: Row[] = [
  { name: "Laptop", device: "laptop", drawn: run(7, 0, []) },
  { name: "iPhone", device: "apple", drawn: run(11, 0.08, []) },
  { name: "Android", device: "android", drawn: run(23, 0.16, [{ at: 12, slots: 5 }]) },
];

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
    <figure ref={el} className="frames" data-play={play || undefined} aria-label="Half a second of the same scroll on a laptop, an iPhone and an Android phone, one glass pane per screen refresh, gray where the page missed one">
      {ROWS.map((row) => (
        <div key={row.name} className="frames-row">
          <div className="frames-name">
            <DeviceIcon device={row.device} />
            <span className="frames-fps num"><CountUp value={done ? Math.round(row.drawn.filter(Boolean).length * 1000 / SPAN) : 0} /><span className="frames-unit">fps</span></span>
          </div>
          <div className="frames-track" aria-hidden="true">
            <span className="frames-shadow" />
            {row.drawn.map((drawn, i) => (
              <span
                key={i}
                className="glass frames-slab"
                data-off={!drawn || undefined}
                style={{
                  left: `${(i / SLOTS) * 100}%`,
                  "--c": drawn ? tint(i / SLOTS) : undefined,
                  "--t": `${LEAD + (i + 1) * BUDGET}ms`,
                } as CSSProperties}
              />
            ))}
          </div>
        </div>
      ))}
    </figure>
  );
}
