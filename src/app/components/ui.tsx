import { useEffect, useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { encode } from "uqr";
import { countUp, flipText } from "../../shared/motion";
import { RATING_LABEL, type Rating } from "../../shared/stats";
import { LEVEL_LABEL, RATING_LEVEL, type Level } from "../../shared/vitals";
import { copyText } from "../lib";

const paths = {
  back: <path d="M10 3.5L5.5 8l4.5 4.5" />,
  chevron: <path d="M4 6l4 4 4-4" />,
  link: <path d="M6.5 9.5l3-3M7 4.5l1-1a2.5 2.5 0 013.5 3.5l-1 1M9 11.5l-1 1A2.5 2.5 0 014.5 9l1-1" />,
  check: <path d="M3.5 8.5l3 3 6-7" />,
  external: <path d="M6 3.5H3.5v9h9V10M9 3h4v4M13 3L7.5 8.5" />,
  download: <path d="M8 2.5v8M4.5 7L8 10.5 11.5 7M3 13.5h10" />,
  upload: <path d="M8 10.5v-8M4.5 6L8 2.5 11.5 6M3 13.5h10" />,
  trash: <path d="M3 4.5h10M6.5 4.5V3h3v1.5M4.5 4.5l.5 8.5h6l.5-8.5" />,
  compare: <path d="M3 13V8M8 13V3M13 13V6" />,
  sun: <><circle cx="8" cy="8" r="2.75" /><path d="M8 1.5v1.25M8 13.25v1.25M1.5 8h1.25M13.25 8h1.25M3.4 3.4l.9.9M11.7 11.7l.9.9M3.4 12.6l.9-.9M11.7 4.3l.9-.9" /></>,
  moon: <path d="M13.25 9.6A5.5 5.5 0 016.4 2.75a5.5 5.5 0 106.85 6.85z" />,
  info: <><circle cx="8" cy="8" r="6.25" /><path d="M8 7.25v3.5M8 5.25h.01" /></>,
  terminal: <><rect x="2" y="3" width="12" height="10" rx="1.5" /><path d="M5 6.5L7 8.25 5 10M8.5 10H11" /></>,
  phone: <><rect x="4.5" y="1.75" width="7" height="12.5" rx="1.75" /><path d="M7.25 11.75h1.5" /></>,
  repeat: <><path d="M3 7.5a5 5 0 019-3l1 1M13 8.5a5 5 0 01-9 3l-1-1" /><path d="M13 2.75v2.75h-2.75M3 13.25V10.5h2.75" /></>,
  battery: <><rect x="1.75" y="5" width="11" height="6" rx="1.5" /><path d="M14.25 7v2M4 7.25v1.5" /></>,
  code: <path d="M5.5 4.5L2 8l3.5 3.5M10.5 4.5L14 8l-3.5 3.5" />,
  layers: <><path d="M8 2.5l5.5 3L8 8.5l-5.5-3z" /><path d="M2.5 8.5L8 11.5l5.5-3M2.5 11L8 14l5.5-3" /></>,
  tag: <><path d="M2.5 2.5h5l6 6-5 5-6-6z" /><path d="M5.25 5.25h.01" /></>,
  layout: <><rect x="2.5" y="2.5" width="11" height="11" rx="1.5" /><path d="M2.5 6.5h11M6.5 6.5v7" /></>,
  drawing: <><path d="M10.5 2.5l3 3-7.5 7.5H3V10z" /><path d="M9 4l3 3" /></>,
  sidebar: <><rect x="2.25" y="3" width="11.5" height="10" rx="1.75" /><path d="M6.25 3v10" /></>,
  steady: <path d="M8 2.5v11M4.5 10L8 13.5 11.5 10" />,
  fast: <path d="M4.5 3.5L8 7l3.5-3.5M4.5 9L8 12.5 11.5 9" />,
  idle: <path d="M6 3.5v9M10 3.5v9" />,
  manual: <path d="M6.5 8.5V3.25a1.25 1.25 0 012.5 0V8M9 7.5V6.75a1.25 1.25 0 012.5 0V9.5c0 2.5-1.75 4-4 4H7c-1.6 0-2.6-.9-3.3-2.1L2.6 9.6a1.2 1.2 0 012-1.2l1.9 2.1" />,
  lock: <><rect x="3" y="7" width="10" height="6.5" rx="1.5" /><path d="M5.25 7V5a2.75 2.75 0 015.5 0v2" /></>,
  markdown: <><rect x="1.75" y="3.5" width="12.5" height="9" rx="1.5" /><path d="M4.25 10V6l1.75 2 1.75-2v4M10.5 6v4M9.25 8.75l1.25 1.25 1.25-1.25" /></>,
  file: <><path d="M4 2.5h5l3 3v8H4z" /><path d="M9 2.5v3h3" /></>,
  device: <><rect x="2.5" y="3" width="11" height="7.5" rx="1" /><path d="M6 13.5h4M8 10.5v3" /></>,
  // Ratings differ in shape as well as color, so they never rely on color alone.
  smooth: <><circle cx="8" cy="8" r="6.25" /><path d="M5.5 8.25l1.75 1.75 3.25-3.75" /></>,
  uneven: <><path d="M7.13 2.75a1 1 0 011.74 0l5.2 9a1 1 0 01-.87 1.5H2.8a1 1 0 01-.87-1.5z" /><path d="M8 6.75v2.5M8 11.5h.01" /></>,
  choppy: <><circle cx="8" cy="8" r="6.25" /><path d="M8 5v3.5M8 11h.01" /></>,
};

export function Icon({ name, size = 16 }: { name: keyof typeof paths; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

/** The mark: a dot on an orbit, something moving in a steady loop. */
export function Mark({ size = 16 }: { size?: number }) {
  return (
    <svg className="mark" width={(size * 12) / 16} height={(size * 14) / 16} viewBox="2 0 12 14" aria-hidden="true">
      <g className="mark-orbit">
        <path d="M13.2 7.27A5.25 5.25 0 1 1 7.82 2.75" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="11.38" cy="3.98" r="1.9" fill="currentColor" />
      </g>
    </svg>
  );
}

/** A number that counts to its value, from wherever it was. */
export function CountUp({ value, format = (v) => String(Math.round(v)), className }: {
  value: number;
  format?: (v: number) => string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const last = useRef(0);
  useEffect(() => {
    if (!ref.current) return;
    countUp(ref.current, value, format, last.current);
    last.current = value;
  }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return <span ref={ref} className={className}>{format(0)}</span>;
}

/** Text that flips upward when it changes. */
export function Flip({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    if (ref.current) flipText(ref.current, text);
  }, [text]);
  return <span ref={ref} className={`flip ${className ?? ""}`} />;
}

export function Disclosure({ title, count, children, defaultOpen = false }: {
  title: string;
  count?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="disclosure">
      <button className="disclosure-btn" aria-expanded={open} onClick={() => setOpen(!open)}>
        <span>{title}</span>
        {count !== undefined && <span className="count num">{count}</span>}
        <Icon name="chevron" />
      </button>
      <div className="disclosure-body" data-open={open || undefined}>
        <div><div className="disclosure-inner">{children}</div></div>
      </div>
    </div>
  );
}

const LEVEL_ICON = { good: "smooth", warn: "uneven", bad: "choppy" } as const;

/** A status as a tag: shape, color and word together, never color alone. */
export function StatusTag({ level, label, size = 24 }: { level: Level; label?: string; size?: 24 | 28 }) {
  return (
    <span className="rating" data-level={level} data-size={size}>
      <Icon name={LEVEL_ICON[level]} size={size === 28 ? 14 : 12} />
      {label ?? LEVEL_LABEL[level]}
    </span>
  );
}

/** How a stretch of frames felt. */
export function RatingTag({ rating, size = 24 }: { rating: Rating; size?: 24 | 28 }) {
  return <StatusTag level={RATING_LEVEL[rating]} label={RATING_LABEL[rating]} size={size} />;
}

/** Just the icon, where a row already names what it's rating. */
export function StatusIcon({ level, size = 14 }: { level: Level; size?: number }) {
  return <span className="status-icon" data-level={level}><Icon name={LEVEL_ICON[level]} size={size} /></span>;
}

/** A bar that grows from zero to its width once it's on screen. */
export function Bar({ value, rating, level, delay = 0, className = "bar", color }: {
  value: number;
  rating?: Rating;
  level?: Level;
  delay?: number;
  className?: string;
  color?: string;
}) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
    return () => cancelAnimationFrame(id);
  }, []);
  return (
    <div
      className={className}
      data-rating={rating}
      data-level={level}
      style={{ width: shown ? `${Math.max(1, Math.min(100, value * 100))}%` : 0, transitionDelay: `${delay}ms`, background: color }}
    />
  );
}

export function Qr({ text }: { text: string }) {
  const { data, size } = encode(text, { ecc: "M", border: 0 });
  let d = "";
  data.forEach((row, y) => row.forEach((on, x) => { if (on) d += `M${x} ${y}h1v1h-1z`; }));
  return (
    <svg className="qr" viewBox={`0 0 ${size} ${size}`} shapeRendering="crispEdges" role="img" aria-label={`QR code for ${text}`}>
      <path d={d} fill="#1a1a1a" />
    </svg>
  );
}

/** A button whose label confirms the action for a moment. */
export function CopyButton({ text, label = "Copy link", className = "btn btn-secondary btn-icon-l", icon = "link" }: {
  text: () => string | Promise<string>;
  label?: string;
  className?: string;
  icon?: keyof typeof paths;
}) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await copyText(await text());
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <button className={className} onClick={copy}>
      <Icon name={done ? "check" : icon} size={14} />
      <Flip text={done ? "Copied" : label} />
    </button>
  );
}

/**
 * An explanation one tap away: an "i" that opens a small card on hover (with a
 * mouse) or on tap. It renders into the body, so tables and animated
 * containers can't clip it.
 */
export function Info({ title, children }: { title: string; children: ReactNode }) {
  const [at, setAt] = useState<{ x: number; y: number; up: boolean } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const id = useId();
  const show = () => {
    const r = btn.current!.getBoundingClientRect();
    const up = r.bottom + 220 > innerHeight && r.top > 240;
    setAt({ x: Math.max(16, Math.min(r.left + r.width / 2 - 140, innerWidth - 296)), y: up ? r.top - 8 : r.bottom + 8, up });
  };
  useEffect(() => {
    if (!at) return;
    const close = () => setAt(null);
    const away = (e: PointerEvent) => !btn.current?.contains(e.target as Node) && close();
    const key = (e: KeyboardEvent) => e.key === "Escape" && close();
    addEventListener("pointerdown", away);
    addEventListener("keydown", key);
    addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      removeEventListener("pointerdown", away);
      removeEventListener("keydown", key);
      removeEventListener("scroll", close, { capture: true });
    };
  }, [at]);
  return (
    <>
      <button
        ref={btn}
        type="button"
        className="info-btn"
        aria-label={`About ${title.toLowerCase()}`}
        aria-expanded={!!at}
        aria-describedby={at ? id : undefined}
        onPointerEnter={(e) => e.pointerType === "mouse" && show()}
        onPointerLeave={(e) => e.pointerType === "mouse" && setAt(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (at) setAt(null);
          else show();
        }}
      >
        <Icon name="info" size={14} />
      </button>
      {at && createPortal(
        <div
          role="tooltip"
          id={id}
          className="info-tip"
          data-up={at.up || undefined}
          style={{ left: at.x, top: at.y }}
        >
          <div className="info-title">{title}</div>
          <div className="info-body">{children}</div>
        </div>,
        document.body,
      )}
    </>
  );
}

export interface Zone {
  /** Upper edge of the zone, in the same unit as the bar. */
  to: number;
  level: Level;
  label?: string;
}

/**
 * Thresholds as a color-coded bar: each zone in its status color with its
 * word under it, the cutoffs labeled, and an optional marker for this run.
 */
export function ZoneBar({ zones, min = 0, max, format, marker, markerLabel }: {
  zones: Zone[];
  /** Where the bar starts, when the low end isn't worth the room. */
  min?: number;
  max: number;
  format: (v: number) => string;
  marker?: number;
  markerLabel?: string;
}) {
  const range = max - min;
  const pct = (v: number) => `${((Math.min(max, Math.max(min, v)) - min) / range) * 100}%`;
  let from = min;
  const spans = zones.map((z) => {
    const s = { ...z, from, to: Math.min(z.to, max) };
    from = s.to;
    return s;
  });
  return (
    <div className="zone" data-marked={marker !== undefined || undefined}>
      {marker !== undefined && (
        <div className="zone-marker" data-edge={(marker - min) / range < 0.15 ? "start" : (marker - min) / range > 0.85 ? "end" : undefined} style={{ left: pct(marker) }}>
          <span className="zone-marker-label num">{markerLabel ?? format(marker)}</span>
        </div>
      )}
      <div className="zone-track">
        {spans.map((z) => (
          <div key={z.from} className="zone-seg" data-level={z.level} style={{ width: `${((z.to - z.from) / range) * 100}%` }} />
        ))}
      </div>
      <div className="zone-words">
        {spans.map((z) => (
          <span key={z.from} style={{ width: `${((z.to - z.from) / range) * 100}%` }}>{z.label ?? LEVEL_LABEL[z.level]}</span>
        ))}
      </div>
      <div className="zone-ticks">
        {spans.slice(0, -1).map((z) => (
          <span key={z.to} className="num" style={{ left: pct(z.to) }}>{format(z.to)}</span>
        ))}
      </div>
    </div>
  );
}

/** A device name from the probe ("iPhone · Safari 26.0") as its two parts. */
export function splitName(name: string): { device: string; browser: string } {
  const [device, ...rest] = name.split(" · ");
  return { device, browser: rest.join(" ") };
}

/** Labeled fields: a small muted label over each value, set as spaced columns. */
export function Fields({ items }: { items: [string, ReactNode][] }) {
  return (
    <dl className="fields">
      {items.map(([k, v]) => (
        <div key={k}>
          <dt>{k}</dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}
