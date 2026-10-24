import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { encode } from "uqr";
import { countUp, flipText } from "../../shared/motion";
import { RATING_LABEL, type Rating } from "../../shared/stats";
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

export function Mark({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <rect x="2" y="7" width="3" height="7" rx="1" fill="currentColor" />
      <rect x="6.5" y="2" width="3" height="12" rx="1" fill="currentColor" />
      <rect x="11" y="5" width="3" height="9" rx="1" fill="currentColor" />
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

/** How a stretch of frames felt, as a tag: shape, color and word together. */
export function RatingTag({ rating, size = 24 }: { rating: Rating; size?: 24 | 28 }) {
  return (
    <span className="rating" data-rating={rating} data-size={size}>
      <Icon name={rating} size={size === 28 ? 14 : 12} />
      {RATING_LABEL[rating]}
    </span>
  );
}

/** A bar that grows from zero to its width once it's on screen. */
export function Bar({ value, rating, delay = 0, className = "bar", color }: {
  value: number;
  rating?: Rating;
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
      <path d={d} fill="var(--ink)" />
    </svg>
  );
}

/** A button whose label confirms the action for a moment. */
export function CopyButton({ text, label = "Copy link", className = "btn btn-secondary btn-icon-l" }: {
  text: () => string | Promise<string>;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    await copyText(await text());
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  };
  return (
    <button className={className} onClick={copy}>
      <Icon name={done ? "check" : "link"} size={14} />
      <Flip text={done ? "Copied" : label} />
    </button>
  );
}
